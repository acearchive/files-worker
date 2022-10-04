interface Env {
  ARTIFACTS_KV: KVNamespace;
  ARTIFACTS_R2: R2Bucket;
}

const notFound = (): Response => new Response(undefined, { status: 404 });

export const onRequestGet: PagesFunction<{
  request: Request;
  env: Env;
}> = async ({ request, env }) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(undefined, { status: 405 });
  }

  const url = new URL(request.url);
  const pathComponents = url.pathname.split("/");

  if (pathComponents.length !== 2) {
    return notFound();
  }

  const [artifactSlug, fileName] = pathComponents;

  if (artifactSlug.length === 0 || fileName.length === 0) {
    return notFound();
  }
};
