import {
  commonResponseHeaders,
  getResponseHeaders,
  Header,
  headersToDebugRepr,
  parseConditionalHeaders,
} from "./headers";
import { parseRangeRequest, toR2Range } from "./range";
import { getStorageKey } from "./storage_key";
import { parseUrl } from "./url";

interface Env {
  ARTIFACTS_KV: KVNamespace;
  ARTIFACTS_R2: R2Bucket;
}

const Status = {
  NotFound(request: Request): Response {
    return new Response(`File ${request.url} not found.`, {
      status: 404,
      headers: commonResponseHeaders,
    });
  },

  MethodNotAllowed(request: Request): Response {
    return new Response(`Method ${request.method} not allowed.`, {
      status: 405,
      headers: {
        [Header.Allow]: "GET, HEAD",
        ...commonResponseHeaders,
      },
    });
  },

  RangeNotSatisfiable(reason: string): Response {
    return new Response(`Invalid or unsupported range request: ${reason}`, {
      status: 416,
      headers: commonResponseHeaders,
    });
  },

  NotModified(headers: Headers): Response {
    return new Response(undefined, {
      status: 304,
      headers,
    });
  },

  PartialContent(body: ReadableStream, headers: Headers): Response {
    return new Response(body, {
      status: 206,
      headers,
    });
  },

  Ok(body: ReadableStream | undefined, headers: Headers): Response {
    return new Response(body, {
      status: 200,
      headers,
    });
  },
};

const hasObjectBody = (
  object: R2Object | R2ObjectBody
): object is R2ObjectBody => "body" in object;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log(`${request.method} ${request.url}`);

    console.log(headersToDebugRepr("Request headers", request.headers));

    if (request.method !== "GET" && request.method !== "HEAD") {
      return Status.MethodNotAllowed(request);
    }

    const urlResult = parseUrl(request);
    if (!urlResult.isValid) {
      return Status.NotFound(request);
    }

    const { locator } = urlResult;

    console.log(`Artifact slug: ${locator.artifactSlug}`);
    console.log(`File name: ${locator.fileName}`);

    const storageKeyResult = await getStorageKey({
      kv: env.ARTIFACTS_KV,
      locator,
    });

    if (storageKeyResult.status === "not_found") {
      return Status.NotFound(request);
    }

    if (storageKeyResult.status === "redirect") {
      console.log(
        `Redirecting from alias to canonical URL: ${storageKeyResult.url}`
      );
      return Response.redirect(storageKeyResult.url.toString(), 301);
    }

    const storageKey = storageKeyResult.storageKey;

    console.log(`Artifact file object key: ${storageKey}`);

    if (request.method === "GET") {
      const rangeRequestResult = parseRangeRequest(request.headers);
      if (!rangeRequestResult.isValid) {
        return Status.RangeNotSatisfiable(rangeRequestResult.reason);
      }

      const { range: rangeRequest } = rangeRequestResult;

      console.log(`Range request: ${JSON.stringify(rangeRequest)}`);

      const object = await env.ARTIFACTS_R2.get(storageKey, {
        onlyIf: parseConditionalHeaders(request.headers),
        range: toR2Range(rangeRequest),
      });

      if (object === null) {
        console.log("Artifact file was not found in Cloudflare R2.");
        return Status.NotFound(request);
      }

      console.log(`Object size: ${object.size}`);

      const responseHeaders = getResponseHeaders({ object, rangeRequest });

      console.log(headersToDebugRepr("Response headers", responseHeaders));

      if (hasObjectBody(object)) {
        if (rangeRequest.kind === "whole-document") {
          return Status.Ok(object.body, responseHeaders);
        } else {
          return Status.PartialContent(object.body, responseHeaders);
        }
      } else {
        return Status.NotModified(responseHeaders);
      }
    } else if (request.method === "HEAD") {
      const object = await env.ARTIFACTS_R2.head(storageKey);

      if (object === null) {
        console.log("Artifact file was not found in Cloudflare R2.");
        return Status.NotFound(request);
      }

      const responseHeaders = getResponseHeaders({ object });

      console.log(headersToDebugRepr("Response headers", responseHeaders));

      return Status.Ok(undefined, responseHeaders);
    } else {
      throw new Error("Error: This branch should be unreachable!");
    }
  },
};
