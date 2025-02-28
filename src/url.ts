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
    `https://files.acearchive.lgbt/artifacts/${
      fileLocation.canonicalSlug
    }/${prettifyFilename(fileLocation.canonicalFilename)}`
  );
};

// When a filename ends with `foo/index.html`, we prettify it to `foo/`.
export const prettifyFilename = (filename: string): string => {
  return filename.replace(new RegExp(`/index\\.html$`), "/");
};

// We also need to be able to uglify filenames so that we can resolve either the
// pretty name or the ugly name to the file in the database.
export const uglifyFilename = (filename: string): string => {
  // We only recognize pretty HTML filenames if they don't include a file
  // extension, which all filenames should.
  if (filename.includes(".")) {
    return filename;
  }

  if (filename.endsWith("/")) {
    return filename + "index.html";
  }

  return filename + "/index.html";
};

export const filenameIsPrettified = (filename: string): boolean => {
  return prettifyFilename(filename) === filename;
};

// Returns whether two filenames are equivalent without regard for whether
// they're prettified or not.
export const filenamesAreEquivalent = (
  first: string,
  second: string
): boolean => {
  return uglifyFilename(first) === uglifyFilename(second);
};
