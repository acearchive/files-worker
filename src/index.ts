interface Env {
  ARTIFACTS_KV: KVNamespace;
  ARTIFACTS_R2: R2Bucket;
}

const notFound = (request: Request): Response =>
  new Response(`File ${new URL(request.url).pathname} not found.`, {
    status: 404,
  });

const methodNotAllowed = (request: Request): Response =>
  new Response(`Method ${request.method} not allowed.`, {
    status: 405,
    headers: { Allow: "GET, HEAD" },
  });

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return methodNotAllowed(request);
    }

    const url = new URL(request.url);
    const pathComponents = url.pathname.split("/");

    if (pathComponents.length !== 3) {
      return notFound(request);
    }

    const [namespace, artifactSlug, fileName] = pathComponents;

    if (
      namespace !== "artifacts" ||
      artifactSlug.length === 0 ||
      fileName.length === 0
    ) {
      return notFound(request);
    }
  },
};
