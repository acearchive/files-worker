// Information used to locate an artifact file.
export type ArtifactFileLocator = Readonly<{
  // This can be the canonical artifact slug or any slug alias.
  slug: string;

  // This can be the canonical filename or any filename alias.
  filename: string;
}>;

export type FileMultihash = string;

// The canonical location of an artifact file.
export type ArtifactFileLocation = Readonly<{
  multihash: FileMultihash;
  canonicalSlug: string;
  canonicalFilename: string;
}>;

export const urlFromLocation = (fileLocation: ArtifactFileLocation): URL => {
  return new URL(
    `https://files.acearchive.lgbt/artifacts/${fileLocation.canonicalSlug}/${fileLocation.canonicalFilename}`
  );
};

// When a URL ends with `foo/index.html`, we prettify it to `foo/`.
export const prettifyHtmlFilename = (url: string): string => {
  return url.replace(new RegExp(`/index\\.html$`), "/");
};

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
  const [namespace, artifactSlug, ...filenameSegments] = pathComponents;

  const filename = filenameSegments.join("/");

  if (namespace !== "artifacts") {
    console.log(
      "Request URL included a path that did not start with `/artifacts/`"
    );
    return { isValid: false };
  }

  if (artifactSlug.length === 0 || filename.length === 0) {
    return { isValid: false };
  }

  return {
    isValid: true,
    locator: {
      slug: artifactSlug,
      filename,
    },
  };
};
