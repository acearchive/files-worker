import { ArtifactFileMetadata, KeyVersion, ArtifactMetadata } from "./model";
import { ArtifactFileLocator } from "./url";

export type StorageKeyResult =
  | {
      status: "found";
      storageKey: string;
    }
  | {
      status: "redirect";
      url: URL;
    }
  | { status: "not_found" };

const getRedirectUrl = ({
  slug,
  fileName,
}: {
  slug: string;
  fileName: string;
}): URL =>
  new URL(`https://files.acearchive.lgbt/artifacts/${slug}/${fileName}`);

const prettifyFileName = (fileName: string): string => {
  const uglySuffix = "/index.html";
  const prettyLen = fileName.length - uglySuffix.length;
  const hasUglySuffix = fileName.substring(prettyLen) === uglySuffix;
  return hasUglySuffix ? fileName.substring(0, prettyLen) + "/" : fileName;
};

const findStorageKeyInMetadata = ({
  locator,
  canonicalArtifactSlug,
  fileMetadata,
}: {
  locator: ArtifactFileLocator;
  canonicalArtifactSlug: ArtifactMetadata["slug"];
  fileMetadata: ArtifactFileMetadata;
}): StorageKeyResult => {
  if (locator.fileName === fileMetadata.fileName) {
    if (locator.artifactSlug !== canonicalArtifactSlug) {
      return {
        status: "redirect",
        url: getRedirectUrl({
          slug: canonicalArtifactSlug,
          fileName: prettifyFileName(fileMetadata.fileName),
        }),
      };
    }

    return {
      status: "found",
      storageKey: fileMetadata.storageKey,
    };
  }

  if (fileMetadata.aliases.includes(locator.fileName)) {
    return {
      status: "redirect",
      url: getRedirectUrl({
        slug: canonicalArtifactSlug,
        fileName: prettifyFileName(fileMetadata.fileName),
      }),
    };
  }

  return { status: "not_found" };
};

const toArtifactKey = (artifactId: string): string =>
  `artifacts:v${KeyVersion.artifacts}:${artifactId}`;

const toSlugKey = (artifactSlug: string): string =>
  `slugs:v${KeyVersion.slugs}:${artifactSlug}`;

type SlugMetadata = Readonly<{
  id: string;
}>;

export const getStorageKey = async ({
  kv,
  locator,
}: {
  kv: KVNamespace;
  locator: ArtifactFileLocator;
}): Promise<StorageKeyResult> => {
  const { metadata: slugMetadata } = await kv.getWithMetadata<SlugMetadata>(
    toSlugKey(locator.artifactSlug)
  );

  if (slugMetadata === null) {
    console.log(`Artifact slug was not found in KV: ${locator.artifactSlug}`);
    return { status: "not_found" };
  }

  const artifactId = slugMetadata.id;

  const artifactMetadata: ArtifactMetadata | null | undefined = await kv.get(
    toArtifactKey(artifactId),
    { type: "json" }
  );

  if (artifactMetadata === null || artifactMetadata === undefined) {
    console.log(`Artifact could not be found in KV by its ID: ${artifactId}`);
    return { status: "not_found" };
  }

  for (const fileMetadata of artifactMetadata.files) {
    let result = findStorageKeyInMetadata({
      locator,
      canonicalArtifactSlug: artifactMetadata.slug,
      fileMetadata,
    });

    if (result.status !== "not_found") {
      return result;
    }

    // We accept "pretty" URLs for HTML files which don't include the trailing
    // `/index.html`. Check if a file with this name exists when it's
    // de-prettified.
    const uglifiedHtmlFileName = `${locator.fileName}/index.html`;

    result = findStorageKeyInMetadata({
      locator: {
        artifactSlug: locator.artifactSlug,
        fileName: uglifiedHtmlFileName,
      },
      canonicalArtifactSlug: artifactMetadata.slug,
      fileMetadata,
    });

    if (result.status !== "not_found") {
      console.log(
        `Found artifact file by de-prettifying file name to: ${uglifiedHtmlFileName}`
      );
      return result;
    }
  }

  console.log("Artifact file was not found in artifact metadata.");

  return { status: "not_found" };
};
