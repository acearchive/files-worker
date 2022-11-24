import {
  ArtifactFileMetadata,
  artifactKeyVersion,
  ArtifactMetadata,
} from "./model";
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

const findStorageKeyInMetadata = ({
  locator,
  canonicalArtifactSlug,
  fileMetadata,
}: {
  locator: ArtifactFileLocator;
  canonicalArtifactSlug: ArtifactMetadata["slug"];
  fileMetadata: ArtifactFileMetadata;
}): StorageKeyResult => {
  if (locator.artifactSlug !== canonicalArtifactSlug) {
    return {
      status: "redirect",
      url: getRedirectUrl({
        slug: canonicalArtifactSlug,
        fileName: fileMetadata.fileName,
      }),
    };
  }

  if (locator.fileName === fileMetadata.fileName) {
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
        fileName: fileMetadata.fileName,
      }),
    };
  }

  return { status: "not_found" };
};

const toArtifactKey = (artifactSlug: string): string =>
  `artifacts:v${artifactKeyVersion}:${artifactSlug}`;

export const getStorageKey = async ({
  kv,
  locator,
}: {
  kv: KVNamespace;
  locator: ArtifactFileLocator;
}): Promise<StorageKeyResult> => {
  const artifactMetadata: ArtifactMetadata | null | undefined = await kv.get(
    toArtifactKey(locator.artifactSlug),
    { type: "json" }
  );

  if (artifactMetadata === null || artifactMetadata === undefined) {
    console.log("Artifact metadata was not found in Cloudflare KV.");
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
        artifactSlug: artifactMetadata.slug,
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
