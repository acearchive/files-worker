import { Router } from "itty-router";
import { getCommonResponseHeaders, Header } from "./headers";
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
  rawFileUrlPathFromMetadata,
  artifactPageUrlFromMetadata,
  locatorIsCanonical,
} from "./url";
import { filePageStyles, filePage } from "./html";

interface Env {
  PRIMARY_BUCKET: R2Bucket;
  SECONDARY_BUCKET: R2Bucket | undefined;
  DB: D1Database;
  ARCHIVE_DOMAIN: string;
}

const router = Router()
  .all("/raw/:slug/:filename", async (request, env: Env) => {
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
        rawFileUrlPathFromMetadata(metadata).toString(),
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
  .all("/artifacts/:slug/:filename", async (request, env) => {
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
        filePageUrlPathFromMetadata(metadata).toString(),
        301
      );
    }

    const htmlDocument = filePage({
      mediaType: metadata.mediaType,
      title: metadata.canonicalFilename,
      rawFileUrl: rawFileUrlPathFromMetadata(metadata),
      artifactPageUrl: artifactPageUrlFromMetadata(env.ARCHIVE_DOMAIN, metadata)
        .href,
    });

    if (htmlDocument !== undefined) {
      const responseHeaders = getCommonResponseHeaders();
      responseHeaders.set(Header.ContentType, "text/html");

      if (request.method === "GET") {
        return Ok(htmlDocument, responseHeaders);
      } else {
        return Ok(undefined, responseHeaders);
      }
    } else {
      return await getArtifactFileWithFallback({
        primaryBucket: env.PRIMARY_BUCKET,
        secondaryBucket: env.SECONDARY_BUCKET,
        multihash: metadata.multihash,
        request,
      });
    }
  })
  .get("/assets/style.css", async () => {
    const responseHeaders = getCommonResponseHeaders();
    responseHeaders.set(Header.ContentType, "text/css");

    return Ok(filePageStyles, responseHeaders);
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
