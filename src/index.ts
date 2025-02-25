import { headersToDebugRepr } from "./headers";
import { getArtifactFile } from "./r2";
import { getFileLocation } from "./sql";
import {
  MethodNotAllowed,
  NotFound,
  ResponseError,
  UnexpectedError,
} from "./status";
import {
  filenameIsPrettified,
  filenamesAreEquivalent,
  parseUrl,
  urlFromLocation,
} from "./url";

interface Env {
  PRIMARY_BUCKET: R2Bucket;
  SECONDARY_BUCKET: R2Bucket | undefined;
  DB: D1Database;
}

const main = async (request: Request, env: Env): Promise<Response> => {
  console.log(`${request.method} ${request.url}`);

  console.log(headersToDebugRepr("Request headers", request.headers));

  if (request.method !== "GET" && request.method !== "HEAD") {
    throw MethodNotAllowed(request.method, ["GET", "HEAD"]);
  }

  const urlResult = parseUrl(request);
  if (!urlResult.isValid) {
    throw NotFound(request);
  }

  const { locator } = urlResult;

  console.log(`Artifact slug: ${locator.slug}`);
  console.log(`File name: ${locator.filename}`);

  const fileLocation = await getFileLocation(env.DB, locator);

  if (fileLocation === undefined) {
    throw NotFound(request);
  }

  if (
    fileLocation.canonicalSlug !== locator.slug ||
    !filenamesAreEquivalent(fileLocation.canonicalFilename, locator.filename) ||
    !filenameIsPrettified(locator.filename)
  ) {
    const redirectUrl = urlFromLocation(fileLocation);

    console.log(`Redirecting from alias to canonical URL: ${redirectUrl}`);

    return Response.redirect(redirectUrl.toString(), 301);
  }

  console.log(`Artifact file multihash key: ${fileLocation.multihash}`);

  try {
    return await getArtifactFile({
      bucket: env.PRIMARY_BUCKET,
      multihash: fileLocation.multihash,
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
        multihash: fileLocation.multihash,
        request,
      });
    } else {
      throw err;
    }
  }
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await main(request, env);
    } catch (err) {
      if (err instanceof ResponseError) {
        return err.response();
      } else if (err instanceof Error) {
        return UnexpectedError(err.message).response();
      } else {
        return UnexpectedError("Unexpected error.").response();
      }
    }
  },
};
