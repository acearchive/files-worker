export const onRequestGet: PagesFunction<{ request: Request }> = async ({
  request,
}) => {
  const url = new URL(request.url);
  const [artifactSlug, fileName] = url.pathname.split("/", 2);
};
