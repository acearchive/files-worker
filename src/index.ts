import { Router } from "itty-router";
import { commonResponseHeaders, Header, headersToDebugRepr } from "./headers";
import { getArtifactFile } from "./r2";
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
import { imagePageTemplate } from "./html";

interface Env {
  PRIMARY_BUCKET: R2Bucket;
  SECONDARY_BUCKET: R2Bucket | undefined;
  DB: D1Database;
  ARCHIVE_URL: string;
}

const router = Router()
  .all("/raw/:slug/:filename", async (request, env: Env) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throw MethodNotAllowed(request.method, ["GET", "HEAD"]);
    }

    console.log(headersToDebugRepr("Request headers", request.headers));

    const locator = {
      slug: request.params.slug,
      filename: request.params.filename,
    };

    console.log(`Artifact slug: ${locator.slug}`);
    console.log(`File name: ${locator.filename}`);

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

    console.log(`Artifact file multihash key: ${metadata.multihash}`);

    try {
      return await getArtifactFile({
        bucket: env.PRIMARY_BUCKET,
        multihash: metadata.multihash,
        request,
      });
    } catch (err) {
      // If the artifact wasn't found in the primary bucket, check the secondary
      // bucket, if one has been configured for this environment.
      if (
        env.SECONDARY_BUCKET &&
        err instanceof ResponseError &&
        err.status === 404
      ) {
        console.log(
          "Artifact not found in primary bucket. Checking secondary bucket."
        );

        return await getArtifactFile({
          bucket: env.SECONDARY_BUCKET,
          multihash: metadata.multihash,
          request,
        });
      } else {
        throw err;
      }
    }
  })
  .all("/artifacts/:slug/:filename", async (request, env) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throw MethodNotAllowed(request.method, ["GET", "HEAD"]);
    }

    console.log(headersToDebugRepr("Request headers", request.headers));

    const locator = {
      slug: request.params.slug,
      filename: request.params.filename,
    };

    console.log(`Artifact slug: ${locator.slug}`);
    console.log(`File name: ${locator.filename}`);

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

    const htmlDocument = imagePageTemplate({
      title: metadata.canonicalFilename,
      iconPath: "https://acearchive.lgbt/images/favicon-64x64.png",
      rawFileUrl: rawFileUrlPathFromMetadata(metadata),
      artifactPageUrl: artifactPageUrlFromMetadata(env.ARCHIVE_URL, metadata)
        .href,
    });

    const responseHeaders = new Headers();
    responseHeaders.set(Header.ContentType, "text/html");

    for (const [header, value] of Object.entries(commonResponseHeaders)) {
      responseHeaders.set(header, value);
    }

    if (request.method === "GET") {
      return Ok(htmlDocument, responseHeaders);
    } else {
      return Ok(undefined, responseHeaders);
    }
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
