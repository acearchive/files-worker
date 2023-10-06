import {
  ArtifactFileLocation,
  ArtifactFileLocator,
  prettifyFilename,
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
        artifact_versions ON artifact_versions.artifact = artifacts.id
      LEFT JOIN
        artifact_aliases ON artifact_aliases.artifact = artifacts.id
      JOIN
        files ON files.artifact = artifacts.id
      LEFT JOIN
        file_aliases ON file_aliases.file = files.id
      JOIN
        (
          SELECT
            artifact_id,
            MAX(version) as version
          FROM
            artifact_versions
          GROUP BY
            artifact_id
        ) AS latest_artifacts
        ON latest_artifacts.artifact_id = artifact_versions.artifact_id
        AND latest_artifacts.version = artifact_versions.version
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

  // While performing this query twice is somewhat wasteful, the query will only
  // execute twice for HTML files.

  let row = await stmt
    .bind(locator.slug, prettifyFilename(locator.filename))
    .first<Row | null>();

  if (row === null) {
    row = await stmt
      .bind(locator.slug, uglifyFilename(locator.filename))
      .first<Row | null>();
  }

  if (row === null) {
    return undefined;
  }

  return {
    multihash: row.multihash,
    canonicalSlug: row.slug,
    canonicalFilename: row.filename,
  };
};
