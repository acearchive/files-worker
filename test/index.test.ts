const baseUrl = "https://files.acearchive.lgbt";

import { parseUrl } from "../src/index";

describe("parseUrl", () => {
  it("fails when there are too few path components", () => {
    const parsedUrl = parseUrl(
      new Request(`${baseUrl}/artifacts/artifact-slug`)
    );

    expect(parsedUrl).toMatchObject({
      isValid: false,
      response: {
        status: 404,
      },
    });
  });

  it("fails when the leading path component is invalid", () => {
    const parsedUrl = parseUrl(
      new Request(
        `${baseUrl}/not-a-valid-path-component/artifact-slug/file-name`
      )
    );

    expect(parsedUrl).toMatchObject({
      isValid: false,
      response: {
        status: 404,
      },
    });
  });

  it("fails when the artifact slug is blank", () => {
    const parsedUrl = parseUrl(new Request(`${baseUrl}/artifacts//file-name`));

    expect(parsedUrl).toMatchObject({
      isValid: false,
      response: {
        status: 404,
      },
    });
  });

  it("fails when the file name is blank", () => {
    const parsedUrl = parseUrl(
      new Request(`${baseUrl}/artifacts/artifact-slug/`)
    );

    console.log(parsedUrl);
    expect(parsedUrl).toMatchObject({
      isValid: false,
      response: {
        status: 404,
      },
    });
  });

  it("fails on consecutive slashes before the file name", () => {
    const parsedUrl = parseUrl(
      new Request(`${baseUrl}//artifacts//artifact-slug/file-name`)
    );

    expect(parsedUrl).toMatchObject({
      isValid: false,
      response: {
        status: 404,
      },
    });
  });

  it("fails on consecutive slashes in the file name", () => {
    const parsedUrl = parseUrl(
      new Request(`${baseUrl}/artifacts/artifact-slug/file-name//index.html//`)
    );

    expect(parsedUrl).toMatchObject({
      isValid: false,
      response: {
        status: 404,
      },
    });
  });

  it("extracts the artifact slug and file name", () => {
    const parsedUrl = parseUrl(
      new Request(`${baseUrl}/artifacts/artifact-slug/file-name`)
    );

    expect(parsedUrl).toMatchObject({
      isValid: true,
      artifactSlug: "artifact-slug",
      fileName: "file-name",
    });
  });

  it("allows trailing slashes", () => {
    const parsedUrl = parseUrl(
      new Request(`${baseUrl}/artifacts/artifact-slug/file-name/`)
    );

    expect(parsedUrl).toMatchObject({
      isValid: true,
      artifactSlug: "artifact-slug",
      fileName: "file-name",
    });
  });

  it("allows file names with slashes", () => {
    const parsedUrl = parseUrl(
      new Request(`${baseUrl}/artifacts/artifact-slug/file-name/index.html`)
    );

    expect(parsedUrl).toMatchObject({
      isValid: true,
      artifactSlug: "artifact-slug",
      fileName: "file-name/index.html",
    });
  });
});
