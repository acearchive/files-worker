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
  ArtifactFileMetadata,
  ArtifactFileLocator,
  filenameIsPrettified,
  filenamesAreEquivalent,
  artifactFileUrlFromMetadata,
  rawUrlFromMetadata,
  artifactPageUrlFromMetadata,
} from "./url";
// import artifactTemplate from "./assets/artifact.html";
import Handlebars from "handlebars";

interface Env {
  PRIMARY_BUCKET: R2Bucket;
  SECONDARY_BUCKET: R2Bucket | undefined;
  DB: D1Database;
  ARCHIVE_URL: string;
  BASE_URL: string;
}

const redirectToCanonical = (
  kind: "artifact" | "raw",
  baseUrl: string,
  metadata: ArtifactFileMetadata,
  locator: ArtifactFileLocator
): Response | undefined => {
  if (
    metadata.canonicalSlug !== locator.slug ||
    !filenamesAreEquivalent(metadata.canonicalFilename, locator.filename) ||
    !filenameIsPrettified(locator.filename)
  ) {
    let redirectUrl;

    if (kind === "artifact") {
      redirectUrl = artifactFileUrlFromMetadata(baseUrl, metadata);
    } else {
      redirectUrl = rawUrlFromMetadata(baseUrl, metadata);
    }

    console.log(`Redirecting from alias to canonical URL: ${redirectUrl}`);

    return Response.redirect(redirectUrl.toString(), 301);
  }

  return undefined;
};

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

    const maybeRedirect = redirectToCanonical(
      "raw",
      env.BASE_URL,
      metadata,
      locator
    );
    if (maybeRedirect !== undefined) {
      return maybeRedirect;
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

    const maybeRedirect = redirectToCanonical(
      "artifact",
      env.BASE_URL,
      metadata,
      locator
    );
    if (maybeRedirect !== undefined) {
      return maybeRedirect;
    }

    const template = Handlebars.compile("");

    const htmlDocument = template({
      title: metadata.canonicalFilename,
      icon: "https://acearchive.lgbt/images/favicon-64x64.png",
      file_src: rawUrlFromMetadata(env.BASE_URL, metadata),
      artifact_link: artifactPageUrlFromMetadata(env.ARCHIVE_URL, metadata),
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
