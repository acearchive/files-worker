interface Env {
  ARTIFACTS_KV: KVNamespace;
  ARTIFACTS_R2: R2Bucket;
}

const Status = {
  NotFound(request: Request): Response {
    return new Response(`File ${request.url} not found.`, {
      status: 404,
    });
  },

  MethodNotAllowed(request: Request): Response {
    return new Response(`Method ${request.method} not allowed.`, {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  },

  RangeNotSatisfiable(reason: string): Response {
    return new Response(`Invalid or unsupported range request: ${reason}`, {
      status: 416,
    });
  },
};

export type ParseUrlResult =
  | { isValid: true; artifactSlug: string; fileName: string }
  | { isValid: false; response: Response };

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
    return { isValid: false, response: Status.NotFound(request) };
  }

  if (pathComponents.length < 3) {
    return { isValid: false, response: Status.NotFound(request) };
  }

  // A file name can contain forward slashes.
  const [namespace, artifactSlug, ...fileNameSegments] = pathComponents;

  const fileName = fileNameSegments.join("/");

  if (
    namespace !== "artifacts" ||
    artifactSlug.length === 0 ||
    fileName.length === 0
  ) {
    return { isValid: false, response: Status.NotFound(request) };
  }

  return {
    isValid: true,
    artifactSlug,
    fileName,
  };
};

export type RangeRequest =
  | { kind: "until-end"; offset: number }
  | { kind: "inclusive"; offset: number; length: number }
  | { kind: "suffix"; suffix: number }
  | { kind: "whole-document" };

export type ParseRangeRequestResponse =
  | { isValid: true; range: Readonly<RangeRequest> }
  | { isValid: false; reason: string };

export const parseRangeRequest = (
  encoded?: string
): ParseRangeRequestResponse => {
  if (encoded === undefined || encoded.trim().length === 0) {
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

  const [rangeStart, rangeEnd] = encodedRangeList[0];

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
        length: Number(rangeEnd) + 1 - Number(rangeStart),
      },
    };
  }
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    console.log(`${request.method} ${request.url}`);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return Status.MethodNotAllowed(request);
    }

    const urlResult = parseUrl(request);
    if (!urlResult.isValid) {
      return urlResult.response;
    }

    const { artifactSlug, fileName } = urlResult;

    return new Response(JSON.stringify({ artifactSlug, fileName }), {
      status: 200,
    });
  },
};
