export const KeyVersion = {
  artifacts: 2,
  slugs: 1,
} as const;

// These types are a subset of the JSON we store in Cloudflare KV, because we
// only need the ability to get the S3 key for a given file name.
export type ArtifactFileMetadata = Readonly<{
  fileName: string;
  storageKey: string;
  aliases: ReadonlyArray<string>;
}>;

export type ArtifactMetadata = Readonly<{
  slug: string;
  files: ReadonlyArray<ArtifactFileMetadata>;
}>;
