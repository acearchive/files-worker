export type ArtifactFileLocator = Readonly<{
  artifactSlug: string;
  fileName: string;
}>;

export type ParseUrlResult =
  | { isValid: true; locator: ArtifactFileLocator }
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
    locator: {
      artifactSlug,
      fileName,
    },
  };
};
