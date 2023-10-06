import { commonResponseHeaders, Header } from "./headers";

const status = {
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

export default status;
