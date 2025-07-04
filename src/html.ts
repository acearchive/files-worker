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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
          </svg>
          <span>Info<span>
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

const videoFilePage = ({
  title,
  artifactPageUrl,
  rawFileUrl,
  mediaType,
}: {
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
  mediaType: string;
}) =>
  baseFilePageTemplate({
    title,
    artifactPageUrl,
    rawFileUrl,
    unsafeEmbed: `
      <video controls>
        <source src="${encodeURI(rawFileUrl)}" type="${mediaType}" />
      </video>
    `,
  });

const pdfFilePage = ({
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
      <object data="${encodeURI(
      rawFileUrl
    )}" type="application/pdf" width="100%" height="100%">
      </object>
    `,
  });

const htmlFilePage = ({
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
      <iframe src="${encodeURI(
      rawFileUrl
    )}" width="100%" height="100%"></iframe>
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
  if (mediaType === "text/html") {
    return htmlFilePage({ title, artifactPageUrl, rawFileUrl });
  } else if (mediaType.startsWith("image/")) {
    return imageFilePage({ title, artifactPageUrl, rawFileUrl });
  } else if (mediaType.startsWith("video/")) {
    return videoFilePage({ title, artifactPageUrl, rawFileUrl, mediaType });
  } else if (mediaType === "application/pdf") {
    return pdfFilePage({ title, artifactPageUrl, rawFileUrl });
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
    stroke-width: 0.5px;
  }

  img {
    display: block;
    max-width: 100vw;
    max-height: 100vh;
    width: auto;
    height: auto;
    object-fit: contain;
  }

  footer {
    position: absolute;
    bottom: 1rem;
    display: flex;
    gap: 1rem;
    border-radius: 1rem;
    background-color: #212121;
    padding: 0.8rem;
    filter: drop-shadow(2px 2px 2px black);
  }
`;
