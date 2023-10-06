export type ArtifactFileLocator = Readonly<{
  // This can be the canonical slug or any slug alias.
  slug: string;

  // This can be the canonical filename or any filename alias.
  filename: string;
}>;

export type FileMultihash = string;

export interface ArtifactFileLocation {
  multihash: FileMultihash;
  canonicalSlug: string;
  canonicalFilename: string;
}

export const getFileLocation = async (
  db: D1Database,
  locator: ArtifactFileLocator
): Promise<ArtifactFileLocation> => {
  interface Row {
    multihash: FileMultihash;
    slug: string;
    filename: string;
  }

  const row = await db
    .prepare(
      `
      SELECT
        files.multihash,
        artifacts.slug,
        files.filename
      FROM
        artifacts
      JOIN
        artifact_versions ON artifact_versions.artifact = artifacts.id
      JOIN
        files ON files.artifact = artifacts.id
      JOIN
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
        AND latest_artifacts.version = artifact_versions.versions
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
    )
    .bind(locator.slug, locator.filename)
    .first<Row>();

  return {
    multihash: row.multihash,
    canonicalSlug: row.slug,
    canonicalFilename: row.filename,
  };
};
