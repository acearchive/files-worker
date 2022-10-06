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
  LastModified: "Last-Modified",
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

  Ok(body: ReadableStream | undefined, headers: Headers): Response {
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
    console.log("Request URL contained consecutive slashes.");
    return { isValid: false };
  }

  if (pathComponents.length < 3) {
    console.log(
      "Request URL did not have enough path segments for a valid URL."
    );
    return { isValid: false };
  }

  // A file name can contain forward slashes.
  const [namespace, artifactSlug, ...fileNameSegments] = pathComponents;

  const fileName = fileNameSegments.join("/");

  if (namespace !== "artifacts") {
    console.log(
      "Request URL included a path that did not start with `/artifacts/`"
    );
    return { isValid: false };
  }

  if (artifactSlug.length === 0 || fileName.length === 0) {
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

  if (unit.trim() !== "bytes") {
    console.log("Request `Range` header included a unit other than `bytes`.");
    return {
      isValid: false,
      reason: "units other than `bytes` are not supported",
    };
  }

  const encodedRangeList = encodedRanges.split(",");

  if (encodedRangeList.length > 1) {
    console.log(
      "Client requested more than one range in the `Range` header. Only going to attempt to return the first."
    );
  }

  const [rangeStart, rangeEnd] = encodedRangeList[0].split("-");

  if (rangeStart.length === 0 && rangeEnd.length === 0) {
    console.log("Could not parse request `Range` header.");
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

const toLastModifiedHeaderValue = (date: Date): string => {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const weekDay = weekDays[date.getUTCDay()];
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");

  return `${weekDay}, ${day} ${month} ${year} ${hour}:${minute}:${second} GMT`;
};

const getResponseHeaders = ({
  object,
  rangeRequest,
}: {
  object: R2Object;
  rangeRequest?: RangeRequest;
}): Headers => {
  const responseHeaders = new Headers();

  object.writeHttpMetadata(responseHeaders);

  responseHeaders.set(Header.ETag, object.httpEtag);
  responseHeaders.set(
    Header.LastModified,
    toLastModifiedHeaderValue(object.uploaded)
  );

  for (const [header, value] of Object.entries(commonResponseHeaders)) {
    responseHeaders.set(header, value);
  }

  if (rangeRequest === undefined || rangeRequest.kind === "whole-document") {
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
    console.log("Artifact metadata was not found in Cloudflare KV.");
    return undefined;
  }

  for (const fileMetadata of artifactMetadata.files) {
    if (fileName === fileMetadata.fileName) return fileMetadata.storageKey;
  }

  console.log("Artifact file was not found in artifact metadata.");
  return undefined;
};

const headersToDebugRepr = (banner: string, headers: Headers): string => {
  return (
    `${banner}:\n` +
    Array.from(headers.entries())
      .map(([header, value]) => `  ${header}: ${value}`)
      .join("\n")
  );
};

const hasObjectBody = (
  object: R2Object | R2ObjectBody
): object is R2ObjectBody => "body" in object;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log(`${request.method} ${request.url}`);

    console.log(headersToDebugRepr("Request headers", request.headers));

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

    const objectKey = await getStorageKey({
      kv: env.ARTIFACTS_KV,
      artifactSlug,
      fileName,
    });

    console.log(`Object key: ${objectKey}`);

    if (objectKey === undefined) {
      return Status.NotFound(request);
    }

    if (request.method === "GET") {
      const rangeRequestResult = parseRangeRequest(request.headers);
      if (!rangeRequestResult.isValid) {
        return Status.RangeNotSatisfiable(rangeRequestResult.reason);
      }

      const { range: rangeRequest } = rangeRequestResult;

      console.log(`Range request: ${JSON.stringify(rangeRequest)}`);

      const object = await env.ARTIFACTS_R2.get(objectKey, {
        onlyIf: request.headers,
        range: toR2Range(rangeRequest),
      });

      if (object === null) {
        console.log("Artifact file was not found in Cloudflare R2.");
        return Status.NotFound(request);
      }

      console.log(`Object size: ${object.size}`);

      const responseHeaders = getResponseHeaders({ object, rangeRequest });

      console.log(headersToDebugRepr("Response headers", responseHeaders));

      if (hasObjectBody(object)) {
        if (rangeRequest.kind === "whole-document") {
          return Status.Ok(object.body, responseHeaders);
        } else {
          return Status.PartialContent(object.body, responseHeaders);
        }
      } else {
        return Status.NotModified(responseHeaders);
      }
    } else if (request.method === "HEAD") {
      const object = await env.ARTIFACTS_R2.head(objectKey);

      if (object === null) {
        console.log("Artifact file was not found in Cloudflare R2.");
        return Status.NotFound(request);
      }

      const responseHeaders = getResponseHeaders({ object });

      console.log(headersToDebugRepr("Response headers", responseHeaders));

      return Status.Ok(undefined, responseHeaders);
    } else {
      throw new Error("Error: This branch should be unreachable!");
    }
  },
};
