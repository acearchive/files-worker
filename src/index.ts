import { headersToDebugRepr } from "./headers";
import { getArtifactFile, getR2ObjectKey } from "./r2";
import { getFileLocation } from "./sql";
import status from "./status";
import {
  filenameIsPrettified,
  filenamesAreEquivalent,
  parseUrl,
  urlFromLocation,
} from "./url";

interface Env {
  ARTIFACTS_R2: R2Bucket;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log(`${request.method} ${request.url}`);

    console.log(headersToDebugRepr("Request headers", request.headers));

    if (request.method !== "GET" && request.method !== "HEAD") {
      return status.MethodNotAllowed(request);
    }

    const urlResult = parseUrl(request);
    if (!urlResult.isValid) {
      return status.NotFound(request);
    }

    const { locator } = urlResult;

    console.log(`Artifact slug: ${locator.slug}`);
    console.log(`File name: ${locator.filename}`);

    const fileLocation = await getFileLocation(env.DB, locator);

    if (fileLocation === undefined) {
      return status.NotFound(request);
    }

    if (
      fileLocation.canonicalSlug !== locator.slug ||
      !filenamesAreEquivalent(
        fileLocation.canonicalFilename,
        locator.filename
      ) ||
      !filenameIsPrettified(locator.filename)
    ) {
      const redirectUrl = urlFromLocation(fileLocation);

      console.log(`Redirecting from alias to canonical URL: ${redirectUrl}`);

      return Response.redirect(redirectUrl.toString(), 301);
    }

    const objectKey = getR2ObjectKey(fileLocation.multihash);

    console.log(`Artifact file object key: ${objectKey}`);

    return await getArtifactFile({
      bucket: env.ARTIFACTS_R2,
      objectKey,
      request,
    });
  },
};
