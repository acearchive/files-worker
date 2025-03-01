import { parseRangeRequest, toR2Range } from "./range";
import { FileMultihash } from "./url";
import {
  getResponseHeaders,
  headersToDebugRepr,
  parseConditionalHeaders,
} from "./headers";
import {
  NotFound,
  NotModified,
  Ok,
  PartialContent,
  RangeNotSatisfiable,
  ResponseError,
} from "./status";

export type R2ObjectKey = string;

export const getR2ObjectKey = (multihash: FileMultihash): R2ObjectKey =>
  `artifacts/${multihash}`;

const hasObjectBody = (
  object: R2Object | R2ObjectBody
): object is R2ObjectBody => "body" in object;

export const getArtifactFile = async ({
  bucket,
  multihash,
  request,
}: {
  bucket: R2Bucket;
  multihash: FileMultihash;
  request: Request;
}): Promise<Response> => {
  const objectKey = getR2ObjectKey(multihash);

  if (request.method === "GET") {
    const rangeRequestResult = parseRangeRequest(request.headers);
    if (!rangeRequestResult.isValid) {
      throw RangeNotSatisfiable(rangeRequestResult.reason);
    }

    const { range: rangeRequest } = rangeRequestResult;

    console.log(`Range request: ${JSON.stringify(rangeRequest)}`);

    const object = await bucket.get(objectKey, {
      onlyIf: parseConditionalHeaders(request.headers),
      range: toR2Range(rangeRequest),
    });

    if (object === null) {
      console.log("Artifact file was not found in Cloudflare R2");
      throw NotFound(request);
    }

    console.log(`Object size: ${object.size}`);

    const responseHeaders = getResponseHeaders({
      object,
      rangeRequest,
      multihash,
    });

    console.log(headersToDebugRepr("Response headers", responseHeaders));

    if (hasObjectBody(object)) {
      if (rangeRequest.kind === "whole-document") {
        return Ok(object.body, responseHeaders);
      } else {
        return PartialContent(object.body, responseHeaders);
      }
    } else {
      return NotModified(responseHeaders);
    }
  } else if (request.method === "HEAD") {
    const object = await bucket.head(objectKey);

    if (object === null) {
      console.log("Artifact file was not found in Cloudflare R2");
      throw NotFound(request);
    }

    const responseHeaders = getResponseHeaders({ object, multihash });

    console.log(headersToDebugRepr("Response headers", responseHeaders));

    return Ok(undefined, responseHeaders);
  } else {
    throw new Error("Error: This branch should be unreachable!");
  }
};

export const getArtifactFileWithFallback = async ({
  primaryBucket,
  secondaryBucket,
  multihash,
  request,
}: {
  primaryBucket: R2Bucket;
  secondaryBucket?: R2Bucket;
  multihash: FileMultihash;
  request: Request;
}): Promise<Response> => {
  try {
    return await getArtifactFile({
      bucket: primaryBucket,
      multihash: multihash,
      request,
    });
  } catch (err) {
    // If the artifact wasn't found in the primary bucket, check the secondary
    // bucket, if one has been configured for this environment.
    if (secondaryBucket && err instanceof ResponseError && err.status === 404) {
      console.log(
        "Artifact not found in primary bucket. Checking secondary bucket."
      );

      return await getArtifactFile({
        bucket: secondaryBucket,
        multihash: multihash,
        request,
      });
    } else {
      throw err;
    }
  }
};
