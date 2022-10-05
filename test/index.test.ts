const baseUrl = "https://files.acearchive.lgbt";

import { parseRangeRequest, parseUrl } from "../src/index";

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

describe("parseRangeRequest", () => {
  it("returns the whole document when the header is missing", () => {
    const parsedRequest = parseRangeRequest(new Headers());

    expect(parsedRequest).toMatchObject({
      isValid: true,
      range: { kind: "whole-document" },
    });
  });

  it("returns the whole document when the header is just whitespace", () => {
    const parsedRequest = parseRangeRequest(new Headers({ Range: " " }));

    expect(parsedRequest).toMatchObject({
      isValid: true,
      range: { kind: "whole-document" },
    });
  });

  it("fails when the unit is not `bytes`", () => {
    const parsedRequest = parseRangeRequest(
      new Headers({ Range: "notavalidunit=100-200" })
    );

    expect(parsedRequest).toMatchObject({ isValid: false });
  });

  it("parses an inclusive range", () => {
    const parsedRequest = parseRangeRequest(
      new Headers({ Range: "bytes=100-200" })
    );

    expect(parsedRequest).toMatchObject({
      isValid: true,
      range: { kind: "inclusive", offset: 100, length: 101 },
    });
  });

  it("parses a range with no end", () => {
    const parsedRequest = parseRangeRequest(
      new Headers({ Range: "bytes=100-" })
    );

    expect(parsedRequest).toMatchObject({
      isValid: true,
      range: { kind: "until-end", offset: 100 },
    });
  });

  it("parses a suffix range", () => {
    const parsedRequest = parseRangeRequest(
      new Headers({ Range: "bytes=-100" })
    );

    expect(parsedRequest).toMatchObject({
      isValid: true,
      range: { kind: "suffix", suffix: 100 },
    });
  });

  it("ignores all but the first range", () => {
    const parsedRequest = parseRangeRequest(
      new Headers({ Range: "bytes=100-200, 300-400, 900-" })
    );

    expect(parsedRequest).toMatchObject({
      isValid: true,
      range: { kind: "inclusive", offset: 100, length: 101 },
    });
  });
});
