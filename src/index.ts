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
};

type ParseUrlResult =
  | { isValid: true; artifactSlug: string; fileName: string }
  | { isValid: false; response: Response };

const parseUrl = (request: Request): ParseUrlResult => {
  const url = new URL(request.url);

  // Remove any leading forward slash.
  const pathComponents = url.pathname.replace("/", "").split("/");

  if (pathComponents.length < 3) {
    return { isValid: false, response: Status.NotFound(request) };
  }

  // A file name can contain forward slashes.
  const [namespace, artifactSlug, ...fileNameSegments] = pathComponents;

  if (
    namespace !== "artifacts" ||
    artifactSlug.length === 0 ||
    fileNameSegments.length === 0
  ) {
    return { isValid: false, response: Status.NotFound(request) };
  }

  return {
    isValid: true,
    artifactSlug,
    fileName: fileNameSegments
      // This normalizes paths with multiple consecutive slashes.
      .filter((segment) => segment.length > 0)
      .join("/"),
  };
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
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
