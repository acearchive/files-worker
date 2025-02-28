import {
  ArtifactFileMetadata,
  ArtifactFileLocator,
  FileMultihash,
  uglifyFilename,
} from "./url";

export const getFileMetadata = async (
  db: D1Database,
  locator: ArtifactFileLocator
): Promise<ArtifactFileMetadata | undefined> => {
  interface Row {
    slug: string;
    filename: string;
    multihash: FileMultihash;
    media_type: string;
  }

  console.log("Querying database");

  const stmt = db.prepare(
    `
      SELECT
        artifacts.slug,
        files.filename,
        files.multihash,
        files.media_type
      FROM
        artifacts
      JOIN
        latest_artifacts ON latest_artifacts.artifact = artifacts.id
      LEFT JOIN
        artifact_aliases ON artifact_aliases.artifact = artifacts.id
      JOIN
        files ON files.artifact = artifacts.id
      LEFT JOIN
        file_aliases ON file_aliases.file = files.id
      WHERE
        (
          artifacts.slug = ?1
          OR artifact_aliases.slug = ?1
        ) AND (
          files.filename = ?2
          OR file_aliases.filename = ?2
        )
      LIMIT 1
    `
  );

  // Filenames will only ever be stored "uglified," because
  // artifact-submit-action validates that filenames must contain a file
  // extension, so filenames in the database will always contain a file
  // extension.
  const row = await stmt
    .bind(locator.slug, uglifyFilename(locator.filename))
    .first<Row | null>();

  if (row === null) {
    return undefined;
  }

  return {
    multihash: row.multihash,
    canonicalSlug: row.slug,
    canonicalFilename: row.filename,
    mediaType: row.media_type,
  };
};
