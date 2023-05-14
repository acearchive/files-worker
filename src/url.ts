export type ArtifactFileLocator = Readonly<{
  artifactSlug: string;
  fileName: string;
}>;

export type ParseUrlResult =
  | { isValid: true; locator: ArtifactFileLocator }
  | { isValid: false };

export const validateUrl = ({
  artifactSlug,
  fileName,
}: {
  artifactSlug?: string;
  fileName?: string;
}): ParseUrlResult => {
  if (artifactSlug === undefined || artifactSlug.length === 0) {
    console.log("Request URL did not have an artifact slug.");
    return { isValid: false };
  }

  if (fileName === undefined || fileName.length === 0) {
    console.log("Request URL did not have a file name.");
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
