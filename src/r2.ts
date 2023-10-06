import { parseRangeRequest, toR2Range } from "./range";
import { FileMultihash } from "./url";
import status from "./status";
import {
  getResponseHeaders,
  headersToDebugRepr,
  parseConditionalHeaders,
} from "./headers";

export type R2ObjectKey = string;

export const getR2ObjectKey = (multihash: FileMultihash): R2ObjectKey =>
  `artifacts/${multihash}`;

const hasObjectBody = (
  object: R2Object | R2ObjectBody
): object is R2ObjectBody => "body" in object;

export const getArtifactFile = async ({
  bucket,
  objectKey,
  request,
}: {
  bucket: R2Bucket;
  objectKey: R2ObjectKey;
  request: Request;
}): Promise<Response> => {
  if (request.method === "GET") {
    const rangeRequestResult = parseRangeRequest(request.headers);
    if (!rangeRequestResult.isValid) {
      return status.RangeNotSatisfiable(rangeRequestResult.reason);
    }

    const { range: rangeRequest } = rangeRequestResult;

    console.log(`Range request: ${JSON.stringify(rangeRequest)}`);

    const object = await bucket.get(objectKey, {
      onlyIf: parseConditionalHeaders(request.headers),
      range: toR2Range(rangeRequest),
    });

    if (object === null) {
      console.log("Artifact file was not found in Cloudflare R2");
      return status.NotFound(request);
    }

    console.log(`Object size: ${object.size}`);

    const responseHeaders = getResponseHeaders({ object, rangeRequest });

    console.log(headersToDebugRepr("Response headers", responseHeaders));

    if (hasObjectBody(object)) {
      if (rangeRequest.kind === "whole-document") {
        return status.Ok(object.body, responseHeaders);
      } else {
        return status.PartialContent(object.body, responseHeaders);
      }
    } else {
      return status.NotModified(responseHeaders);
    }
  } else if (request.method === "HEAD") {
    const object = await bucket.head(objectKey);

    if (object === null) {
      console.log("Artifact file was not found in Cloudflare R2");
      return status.NotFound(request);
    }

    const responseHeaders = getResponseHeaders({ object });

    console.log(headersToDebugRepr("Response headers", responseHeaders));

    return status.Ok(undefined, responseHeaders);
  } else {
    throw new Error("Error: This branch should be unreachable!");
  }
};
