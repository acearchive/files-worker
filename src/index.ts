import { Router } from "itty-router";
import { getCommonResponseHeaders, Header, prefersHtmlOver } from "./headers";
import { getArtifactFileWithFallback } from "./r2";
import { getFileMetadata } from "./sql";
import {
  MethodNotAllowed,
  NotFound,
  Ok,
  ResponseError,
  UnexpectedError,
} from "./status";
import {
  filePageUrlPathFromMetadata,
  artifactPageUrlFromMetadata,
  locatorIsCanonical,
  filePageShortUrlPathFromMetadata,
  rawFileShortUrlPathFromMetadata,
} from "./url";
import { filePageStyles, filePage, filePageScript } from "./html";

interface Env {
  PRIMARY_BUCKET: R2Bucket;
  SECONDARY_BUCKET: R2Bucket | undefined;
  DB: D1Database;
  ARCHIVE_DOMAIN: string;
}

const router = Router()
  .all("/raw/:slug/:filename+", async (request, env: Env) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throw MethodNotAllowed(request.method, ["GET", "HEAD"]);
    }

    const locator = {
      slug: request.params.slug,
      filename: request.params.filename,
    };

    const metadata = await getFileMetadata(env.DB, locator);

    if (metadata === undefined) {
      throw NotFound(request);
    }

    return Response.redirect(
      new URL(request.url).origin + rawFileShortUrlPathFromMetadata(metadata),
      301
    );
  })
  .all("/r/:id/:filename+", async (request, env: Env) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throw MethodNotAllowed(request.method, ["GET", "HEAD"]);
    }

    const locator = {
      id: request.params.id,
      filename: request.params.filename,
    };

    const metadata = await getFileMetadata(env.DB, locator);

    if (metadata === undefined) {
      throw NotFound(request);
    }

    if (!locatorIsCanonical(locator, metadata)) {
      return Response.redirect(
        new URL(request.url).origin + rawFileShortUrlPathFromMetadata(metadata),
        301
      );
    }

    return await getArtifactFileWithFallback({
      primaryBucket: env.PRIMARY_BUCKET,
      secondaryBucket: env.SECONDARY_BUCKET,
      multihash: metadata.multihash,
      request,
    });
  })
  .all("/artifacts/:slug/:filename+", async (request, env) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throw MethodNotAllowed(request.method, ["GET", "HEAD"]);
    }

    const locator = {
      slug: request.params.slug,
      filename: request.params.filename,
    };

    const metadata = await getFileMetadata(env.DB, locator);

    if (metadata === undefined) {
      throw NotFound(request);
    }

    if (!locatorIsCanonical(locator, metadata)) {
      return Response.redirect(
        new URL(request.url).origin + filePageUrlPathFromMetadata(metadata),
        301
      );
    }

    const acceptHeader = request.headers.get(Header.Accept);
    const prefersHtml = acceptHeader
      ? prefersHtmlOver(acceptHeader, metadata.mediaType)
      : false;

    const htmlDocument = prefersHtml
      ? filePage({
        mediaType: metadata.mediaType,
        title: metadata.canonicalFilename,
        artifactPageUrl: artifactPageUrlFromMetadata(
          env.ARCHIVE_DOMAIN,
          metadata
        ).href,
        shortFileUrl:
          new URL(request.url).origin +
          filePageShortUrlPathFromMetadata(metadata),
        shortRawFileUrlPath: rawFileShortUrlPathFromMetadata(metadata),
      })
      : undefined;

    if (htmlDocument !== undefined) {
      const responseHeaders = getCommonResponseHeaders();
      responseHeaders.set(Header.ContentType, "text/html");
      responseHeaders.set(Header.Vary, Header.Accept);

      if (request.method === "GET") {
        return Ok(htmlDocument, responseHeaders);
      } else {
        return Ok(undefined, responseHeaders);
      }
    } else {
      const response = await getArtifactFileWithFallback({
        primaryBucket: env.PRIMARY_BUCKET,
        secondaryBucket: env.SECONDARY_BUCKET,
        multihash: metadata.multihash,
        request,
      });

      response.headers.set(Header.Vary, Header.Accept);

      return response;
    }
  })
  .all("/a/:id/:filename+", async (request, env: Env) => {
    const locator = {
      id: request.params.id,
      filename: request.params.filename,
    };

    const metadata = await getFileMetadata(env.DB, locator);

    if (metadata === undefined) {
      throw NotFound(request);
    }

    return Response.redirect(
      new URL(request.url).origin + filePageUrlPathFromMetadata(metadata),
      301
    );
  })
  .get("/assets/style.css", async () => {
    const responseHeaders = getCommonResponseHeaders();
    responseHeaders.set(Header.ContentType, "text/css");

    return Ok(filePageStyles, responseHeaders);
  })
  .get("/assets/script.js", async () => {
    const responseHeaders = getCommonResponseHeaders();
    responseHeaders.set(Header.ContentType, "application/javascript");

    return Ok(filePageScript, responseHeaders);
  })
  .all("*", async (request) => {
    throw NotFound(request);
  });

export default {
  fetch: (request: Request, env: Env) =>
    router.fetch(request, env).catch(async (err: unknown) => {
      if (err instanceof ResponseError) {
        console.log(err.message);
        return err.response();
      } else if (err instanceof Error) {
        console.log(err.message);
        return UnexpectedError(err.message).response();
      } else {
        return UnexpectedError("Unexpected error.").response();
      }
    }),
};
