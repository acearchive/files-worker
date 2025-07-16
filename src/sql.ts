import {
  ArtifactFileMetadata,
  ArtifactFileLocator,
  FileMultihash,
  uglifyFilename,
  locatorIsById,
  locatorIsBySlug,
} from "./url";

export const getFileMetadata = async (
  db: D1Database,
  locator: ArtifactFileLocator
): Promise<ArtifactFileMetadata | undefined> => {
  interface Row {
    artifact_id: string;
    slug: string;
    filename: string;
    multihash: FileMultihash;
    media_type: string;
  }

  console.log("Querying database");

  const stmt = db.prepare(
    `
      SELECT
        latest_artifacts.artifact_id,
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
        CASE
          WHEN ?1 IS NOT NULL THEN
            latest_artifacts.artifact_id = ?1
          ELSE
            (
              artifacts.slug = ?2
              OR artifact_aliases.slug = ?2
            )
        END AND (
          files.filename = ?3
          OR file_aliases.filename = ?3
        )
      LIMIT 1
    `
  );

  const artifactId = locatorIsById(locator) ? locator.id : null;
  const artifactSlug = locatorIsBySlug(locator) ? locator.slug : null;

  // Filenames will only ever be stored "uglified," because
  // artifact-submit-action validates that filenames must contain a file
  // extension, so filenames in the database will always contain a file
  // extension.
  const row = await stmt
    .bind(artifactId, artifactSlug, uglifyFilename(locator.filename))
    .first<Row | null>();

  if (row === null) {
    return undefined;
  }

  return {
    multihash: row.multihash,
    artifactId: row.artifact_id,
    canonicalSlug: row.slug,
    canonicalFilename: row.filename,
    mediaType: row.media_type,
  };
};
