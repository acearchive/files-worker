const escapeHtml = (raw: string) =>
  raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const baseFilePageTemplate = ({
  title,
  iconPath,
  artifactPageUrl,
  rawFileUrl,
  unsafeEmbed,
}: {
  title: string;
  iconPath: string;
  artifactPageUrl: string;
  rawFileUrl: string;
  unsafeEmbed: string;
}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(title)}</title>
      <link rel="icon" href="${encodeURI(iconPath)}" />
      <link rel="stylesheet" type="text/css" href="/assets/style.css" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <main>
        ${unsafeEmbed}
      </main>
      <footer>
        <a href="${encodeURI(artifactPageUrl)}">Ace Archive</a>
        <a href="${encodeURI(rawFileUrl)}">Raw File</a>
      </footer>
    </body>
  </html>
`;

export const imagePageTemplate = ({
  title,
  iconPath,
  artifactPageUrl,
  rawFileUrl,
}: {
  title: string;
  iconPath: string;
  artifactPageUrl: string;
  rawFileUrl: string;
}) =>
  baseFilePageTemplate({
    title,
    iconPath,
    artifactPageUrl,
    rawFileUrl,
    unsafeEmbed: `
      <img src="${encodeURI(rawFileUrl)}" />
    `,
  });

export const filePathStyles = `
  body {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  footer {
    display: flex;
    gap: 1rem;
    margin-top: auto;
  }
`;
