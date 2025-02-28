import {
  ArtifactFileLocation,
  ArtifactFileLocator,
  FileMultihash,
  uglifyFilename,
} from "./url";

export const getFileLocation = async (
  db: D1Database,
  locator: ArtifactFileLocator
): Promise<ArtifactFileLocation | undefined> => {
  interface Row {
    multihash: FileMultihash;
    slug: string;
    filename: string;
  }

  console.log("Querying database");

  const stmt = db.prepare(
    `
      SELECT
        files.multihash,
        artifacts.slug,
        files.filename
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
  };
};
