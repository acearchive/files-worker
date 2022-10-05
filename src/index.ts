interface Env {
  ARTIFACTS_KV: KVNamespace;
  ARTIFACTS_R2: R2Bucket;
}

const artifactKeyVersion = 1;

// These types are a subset of the JSON we store in Cloudflare KV, because we
// only need the ability to get the S3 key for a given file name.
type ArtifactFileMetadata = Readonly<{
  fileName: string;
  storageKey: string;
}>;

type ArtifactMetadata = Readonly<{
  files: ReadonlyArray<ArtifactFileMetadata>;
}>;

const Header = {
  Allow: "Allow",
  Range: "Range",
  ETag: "ETag",
  ContentLength: "Content-Length",
  ContentRange: "Content-Range",
  AcceptRanges: "Accept-Ranges",
};

const commonResponseHeaders: Readonly<Record<string, string>> = {
  [Header.AcceptRanges]: "bytes",
};

const Status = {
  NotFound(request: Request): Response {
    return new Response(`File ${request.url} not found.`, {
      status: 404,
      headers: commonResponseHeaders,
    });
  },

  MethodNotAllowed(request: Request): Response {
    return new Response(`Method ${request.method} not allowed.`, {
      status: 405,
      headers: {
        [Header.Allow]: "GET, HEAD",
        ...commonResponseHeaders,
      },
    });
  },

  RangeNotSatisfiable(reason: string): Response {
    return new Response(`Invalid or unsupported range request: ${reason}`, {
      status: 416,
      headers: commonResponseHeaders,
    });
  },

  NotModified(headers: Headers): Response {
    return new Response(undefined, {
      status: 304,
      headers,
    });
  },

  PartialContent(body: ReadableStream, headers: Headers): Response {
    return new Response(body, {
      status: 206,
      headers,
    });
  },

  Ok(body: ReadableStream, headers: Headers): Response {
    return new Response(body, {
      status: 200,
      headers,
    });
  },
};

export type ParseUrlResult =
  | { isValid: true; artifactSlug: string; fileName: string }
  | { isValid: false };

export const parseUrl = (request: Request): ParseUrlResult => {
  const url = new URL(request.url);

  // Remove the leading forward slash.
  const urlPath = url.pathname.replace("/", "");

  // Remove any trailing forward slash.
  const pathComponents = url.pathname.endsWith("/")
    ? urlPath.slice(0, -1).split("/")
    : urlPath.split("/");

  // Fail if there are any consecutive slashes in the URL.
  if (pathComponents.some((component) => component.length === 0)) {
    return { isValid: false };
  }

  if (pathComponents.length < 3) {
    return { isValid: false };
  }

  // A file name can contain forward slashes.
  const [namespace, artifactSlug, ...fileNameSegments] = pathComponents;

  const fileName = fileNameSegments.join("/");

  if (
    namespace !== "artifacts" ||
    artifactSlug.length === 0 ||
    fileName.length === 0
  ) {
    return { isValid: false };
  }

  return {
    isValid: true,
    artifactSlug,
    fileName,
  };
};

export type RangeRequest =
  | { kind: "until-end"; offset: number }
  | { kind: "inclusive"; offset: number; end: number; length: number }
  | { kind: "suffix"; suffix: number }
  | { kind: "whole-document" };

type PartialRangeRequest = Exclude<RangeRequest, { kind: "whole-document" }>;

export type ParseRangeRequestResponse =
  | { isValid: true; range: Readonly<RangeRequest> }
  | { isValid: false; reason: string };

export const parseRangeRequest = (
  headers: Headers
): ParseRangeRequestResponse => {
  const encoded = headers.get("Range");

  if (encoded === null || encoded.trim().length === 0) {
    return {
      isValid: true,
      range: { kind: "whole-document" },
    };
  }

  const [unit, encodedRanges] = encoded.split("=");

  if (unit.trim() !== "bytes")
    return {
      isValid: false,
      reason: "units other than `bytes` are not supported",
    };

  const encodedRangeList = encodedRanges.split(",");

  if (encodedRangeList.length > 1) {
    console.log(
      "Client requested more than one range in the `Range` header. Only going to attempt to return the first."
    );
  }

  const [rangeStart, rangeEnd] = encodedRangeList[0].split("-");

  if (rangeStart.length === 0 && rangeEnd.length === 0) {
    return { isValid: false, reason: "failed to parse request header" };
  } else if (rangeStart.length === 0) {
    return {
      isValid: true,
      range: { kind: "suffix", suffix: Number(rangeEnd) },
    };
  } else if (rangeEnd.length === 0) {
    return {
      isValid: true,
      range: { kind: "until-end", offset: Number(rangeStart) },
    };
  } else {
    return {
      isValid: true,
      range: {
        kind: "inclusive",
        offset: Number(rangeStart),
        end: Number(rangeEnd),
        length: Number(rangeEnd) + 1 - Number(rangeStart),
      },
    };
  }
};

const toR2Range = (request: RangeRequest): R2Range | undefined => {
  switch (request.kind) {
    case "until-end":
      return { offset: request.offset };
    case "inclusive":
      return { offset: request.offset, length: request.length };
    case "suffix":
      return { suffix: request.suffix };
    case "whole-document":
      return undefined;
  }
};

// This SO answer has some excellent examples for how HTTP range headers should
// be formatted:
//
// https://stackoverflow.com/a/8507991

const toContentRangeHeaderValue = (
  request: PartialRangeRequest,
  totalSize: number
): string => {
  switch (request.kind) {
    case "until-end":
      return `bytes ${request.offset}-${totalSize - 1}/${totalSize}`;
    case "inclusive":
      return `bytes ${request.offset}-${request.end}/${totalSize}`;
    case "suffix":
      return `bytes ${totalSize - request.suffix}-${
        totalSize - 1
      }/${totalSize}`;
  }
};

const toContentLengthHeaderValue = (
  request: PartialRangeRequest,
  totalSize: number
): string => {
  switch (request.kind) {
    case "until-end":
      return (totalSize - request.offset).toString();
    case "inclusive":
      return request.length.toString();
    case "suffix":
      return request.suffix.toString();
  }
};

const getResponseHeaders = ({
  object,
  rangeRequest,
}: {
  object: R2Object;
  rangeRequest: RangeRequest;
}): Headers => {
  const responseHeaders = new Headers();

  object.writeHttpMetadata(responseHeaders);
  responseHeaders.set(Header.ETag, object.httpEtag);

  for (const [header, value] of Object.entries(commonResponseHeaders)) {
    responseHeaders.set(header, value);
  }

  if (rangeRequest.kind === "whole-document") {
    responseHeaders.set(Header.ContentLength, object.size.toString());
  } else {
    responseHeaders.set(
      Header.ContentLength,
      toContentLengthHeaderValue(rangeRequest, object.size)
    );
    responseHeaders.set(
      Header.ContentRange,
      toContentRangeHeaderValue(rangeRequest, object.size)
    );
  }

  return responseHeaders;
};

const toArtifactKey = (artifactSlug: string): string =>
  `artifacts:v${artifactKeyVersion}:${artifactSlug}`;

const getStorageKey = async ({
  kv,
  artifactSlug,
  fileName,
}: {
  kv: KVNamespace;
  artifactSlug: string;
  fileName: string;
}): Promise<string | undefined> => {
  const artifactMetadata: ArtifactMetadata | null | undefined = await kv.get(
    toArtifactKey(artifactSlug),
    { type: "json" }
  );

  if (artifactMetadata === null || artifactMetadata === undefined) {
    return undefined;
  }

  for (const fileMetadata of artifactMetadata.files) {
    if (fileName === fileMetadata.fileName) return fileMetadata.storageKey;
  }

  return undefined;
};

const logHeaders = (headers: Headers): void => {
  for (const [header, value] of headers.entries()) {
    console.log(`  ${header}: ${value}`);
  }
};

const hasObjectBody = (
  object: R2Object | R2ObjectBody
): object is R2ObjectBody => "body" in object;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log(`${request.method} ${request.url}`);

    console.log("Request headers:");
    logHeaders(request.headers);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return Status.MethodNotAllowed(request);
    }

    const urlResult = parseUrl(request);
    if (!urlResult.isValid) {
      return Status.NotFound(request);
    }

    const { artifactSlug, fileName } = urlResult;

    console.log(`Artifact slug: ${artifactSlug}`);
    console.log(`File name: ${fileName}`);

    const rangeRequestResult = parseRangeRequest(request.headers);
    if (!rangeRequestResult.isValid) {
      return Status.RangeNotSatisfiable(rangeRequestResult.reason);
    }

    const { range: rangeRequest } = rangeRequestResult;

    console.log(`Range request: ${rangeRequest}`);

    const objectKey = await getStorageKey({
      kv: env.ARTIFACTS_KV,
      artifactSlug,
      fileName,
    });

    console.log(`Object key: ${objectKey}`);

    if (objectKey === undefined) {
      return Status.NotFound(request);
    }

    const object = await env.ARTIFACTS_R2.get(objectKey, {
      onlyIf: request.headers,
      range: toR2Range(rangeRequest),
    });

    if (object === null) return Status.NotFound(request);

    console.log(`Object size: ${object.size}`);

    const responseHeaders = getResponseHeaders({ object, rangeRequest });

    console.log("Response headers:");
    logHeaders(responseHeaders);

    if (hasObjectBody(object)) {
      if (rangeRequest.kind === "whole-document") {
        return Status.Ok(object.body, responseHeaders);
      } else {
        return Status.PartialContent(object.body, responseHeaders);
      }
    } else {
      return Status.NotModified(responseHeaders);
    }
  },
};
