import { PROD_ARCHIVE_DOMAIN } from "./csp";

const escapeHtml = (raw: string) =>
  raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const baseFilePageTemplate = ({
  title,
  artifactPageUrl,
  rawFileUrl,
  unsafeEmbed,
}: {
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
  unsafeEmbed: string;
}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(title)}</title>
      <link rel="icon" href="https://${PROD_ARCHIVE_DOMAIN}/images/favicon-64x64.png" />
      <link rel="stylesheet" type="text/css" href="/assets/style.css" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <main>
        ${unsafeEmbed}
      </main>
      <footer>
        <a href="${encodeURI(artifactPageUrl)}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
          </svg>
          <span>Archive<span>
        </a>
        <a href="${encodeURI(rawFileUrl)}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark" viewBox="0 0 16 16">
            <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
          </svg>
          <span>Raw</span>
        </a>
      </footer>
    </body>
  </html>
`;

const imageFilePage = ({
  title,
  artifactPageUrl,
  rawFileUrl,
}: {
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
}) =>
  baseFilePageTemplate({
    title,
    artifactPageUrl,
    rawFileUrl,
    unsafeEmbed: `
      <img src="${encodeURI(rawFileUrl)}" />
    `,
  });

export const filePage = ({
  mediaType,
  title,
  artifactPageUrl,
  rawFileUrl,
}: {
  mediaType: string;
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
}) => {
  if (mediaType.startsWith("image/")) {
    return imageFilePage({ title, artifactPageUrl, rawFileUrl });
  } else {
    return undefined;
  }
};

// The colors in this stylesheet are taken from the static site and should be
// kept in sync with it.
export const filePageStyles = `
  @font-face {
    font-family: "Fira Sans";
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local("Fira Sans"), url("https://${PROD_ARCHIVE_DOMAIN}/fonts/fira-sans/FiraSans-Regular-latin.woff2") format("woff2");
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304,
      U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF,
      U+FFFD;
  }

  body {
    margin: 0;
    display: flex;
    justify-content: center;
    background-color: #212121;
    height: 100vh;
    font-family: Fira Sans, Noto Sans, sans-serif;
  }

  main {
    display: flex;
    justify-content: center;
    height: 100vh;
    width: 100vw;
    padding: 5rem;
    max-height: calc(100vh - 10rem);
    max-width: calc(100vw - 10rem);
  }

  a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #d3e5c1;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: #d3e5c1;
  }

  a:hover {
    background-color: #d3e5c1;
    color: #212121;
  }

  a svg path {
    stroke: #d3e5c1;
  }

  a:hover svg path {
    stroke: #212121;
  }

  a svg path {
    stroke-width: 1px;
  }

  img {
    display: block;
    height: 100%;
    width: auto;
    object-fit: none;
  }

  footer {
    position: absolute;
    bottom: 1rem;
    display: flex;
    gap: 1rem;
  }
`;
