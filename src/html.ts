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
  shortFileUrl,
  shortRawFileUrl,
  unsafeEmbed,
}: {
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
  shortFileUrl: string;
  shortRawFileUrl: string;
  unsafeEmbed: string;
}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(title)}</title>
      <link rel="icon" href="https://${PROD_ARCHIVE_DOMAIN}/images/favicon-64x64.png" />
      <link rel="stylesheet" type="text/css" href="/assets/style.css" />
      <script type="module" src="/assets/script.js" async></script>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <main>
        ${unsafeEmbed}
      </main>
      <footer>
        <div id="toast" hidden>
          <span class="toast-message" id="copy-toast">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-clipboard-check" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
              <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
              <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
            </svg>
            URL copied to clipboard!
          </span>
        </div>
        <div id="buttons">
          <a href="${encodeURI(artifactPageUrl)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
            </svg>
            <span>About<span>
          </a>
          <a href="${encodeURI(rawFileUrl)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark" viewBox="0 0 16 16">
              <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
            </svg>
            <span>Raw File</span>
          </a>
          <button type="button" id="copy-short-url-button" data-url="${encodeURI(
  shortFileUrl
)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share-fill" viewBox="0 0 16 16">
              <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5"/>
            </svg>
            <span>Short URL</span>
          </button>
          <button type="button" id="copy-short-raw-url-button" data-url="${encodeURI(
  shortRawFileUrl
)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share-fill" viewBox="0 0 16 16">
              <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5"/>
            </svg>
            <span>Short Raw URL</span>
          </button>
        </div>
      </footer>
    </body>
  </html>
`;

const imageFilePage = ({
  title,
  artifactPageUrl,
  rawFileUrl,
  shortFileUrl,
  shortRawFileUrl,
}: {
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
  shortFileUrl: string;
  shortRawFileUrl: string;
}) =>
  baseFilePageTemplate({
    title,
    artifactPageUrl,
    rawFileUrl,
    shortFileUrl,
    shortRawFileUrl,
    unsafeEmbed: `
      <img src="${encodeURI(rawFileUrl)}" />
    `,
  });

const videoFilePage = ({
  title,
  artifactPageUrl,
  rawFileUrl,
  mediaType,
  shortFileUrl,
  shortRawFileUrl,
}: {
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
  mediaType: string;
  shortFileUrl: string;
  shortRawFileUrl: string;
}) =>
  baseFilePageTemplate({
    title,
    artifactPageUrl,
    rawFileUrl,
    shortFileUrl,
    shortRawFileUrl,
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
  shortFileUrl,
  shortRawFileUrl,
}: {
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
  shortFileUrl: string;
  shortRawFileUrl: string;
}) =>
  baseFilePageTemplate({
    title,
    artifactPageUrl,
    rawFileUrl,
    shortFileUrl,
    shortRawFileUrl,
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
  shortFileUrl,
  shortRawFileUrl,
}: {
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
  shortFileUrl: string;
  shortRawFileUrl: string;
}) =>
  baseFilePageTemplate({
    title,
    artifactPageUrl,
    rawFileUrl,
    shortFileUrl,
    shortRawFileUrl,
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
  shortFileUrl,
  shortRawFileUrl,
}: {
  mediaType: string;
  title: string;
  artifactPageUrl: string;
  rawFileUrl: string;
  shortFileUrl: string;
  shortRawFileUrl: string;
}) => {
  if (mediaType === "text/html") {
    return htmlFilePage({
      title,
      artifactPageUrl,
      rawFileUrl,
      shortFileUrl,
      shortRawFileUrl,
    });
  } else if (mediaType.startsWith("image/")) {
    return imageFilePage({
      title,
      artifactPageUrl,
      rawFileUrl,
      shortFileUrl,
      shortRawFileUrl,
    });
  } else if (mediaType.startsWith("video/")) {
    return videoFilePage({
      title,
      artifactPageUrl,
      rawFileUrl,
      mediaType,
      shortFileUrl,
      shortRawFileUrl,
    });
  } else if (mediaType === "application/pdf") {
    return pdfFilePage({
      title,
      artifactPageUrl,
      rawFileUrl,
      shortFileUrl,
      shortRawFileUrl,
    });
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

  button {
    background-color: transparent;
  }

  a, button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid #d3e5c1;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: #d3e5c1;
  }

  a:hover, button:hover {
    background-color: #d3e5c1;
    color: #212121;
  }

  :is(a, button) svg path {
    stroke: #d3e5c1;
  }

  :is(a:hover, button:hover) svg path {
    stroke: #212121;
  }

  :is(a, button) svg path {
    stroke-width: 0.5px;
  }

  img, video {
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
    flex-direction: column;
    justify-content: center;
    margin-left: 1rem;
    margin-right: 1rem;
  }

  #buttons, #toast {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    border-radius: 1rem;
    background-color: #212121;
    padding: 0.8rem;
    margin-left: auto;
    margin-right: auto;
    filter: drop-shadow(2px 2px 2px black);
  }

  #toast {
    color: #dee2e6;
  }

  #toast[hidden] {
    display: none;
  }

  .toast-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  @media (width < 40rem) {
    a, button {
      flex-grow: 1;
    }
  }
`;

export const filePageScript = `
  const copyShortFileUrlButton = document.getElementById("copy-short-url-button");
  const copyShortRawFileUrlButton = document.getElementById("copy-short-raw-url-button");
  const toast = document.getElementById("toast");

  copyShortFileUrlButton.addEventListener("click", () => {
    const url = copyShortFileUrlButton.dataset.url;
    navigator.clipboard.writeText(url).then(() => {
      toast.hidden = false;
      setTimeout(() => {
        toast.hidden = true;
      }, 1500)
    });
  });

  copyShortRawFileUrlButton.addEventListener("click", () => {
    const url = copyShortRawFileUrlButton.dataset.url;
    navigator.clipboard.writeText(url).then(() => {
      toast.hidden = false;
      setTimeout(() => {
        toast.hidden = true;
      }, 1500)
    });
  });
`;
