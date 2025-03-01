import { commonResponseHeaderMap, Header } from "./headers";

export class ResponseError extends Error {
  readonly status: number;
  readonly headers: Record<string, string>;

  constructor({
    status,
    reason,
    headers,
  }: {
    status: number;
    reason: string;
    headers?: Record<string, string>;
  }) {
    super(reason);
    this.status = status;
    this.headers = headers ?? {};
  }

  response = (): Response =>
    new Response(JSON.stringify({ error: this.message, status: this.status }), {
      status: this.status,
      headers: {
        [Header.ContentType]: "application/json",
        ...commonResponseHeaderMap,
        ...this.headers,
      },
    });
}

export const NotFound = (request: Request): ResponseError =>
  new ResponseError({
    status: 404,
    reason: `File ${request.url} not found.`,
  });

export const MethodNotAllowed = (
  actual: string,
  allowed: ReadonlyArray<string>
): ResponseError =>
  new ResponseError({
    status: 405,
    reason: `Method ${actual} not allowed.`,
    headers: {
      [Header.Allow]: allowed.join(", "),
    },
  });

export const RangeNotSatisfiable = (reason: string): ResponseError =>
  new ResponseError({
    status: 416,
    reason: `Invalid or unsupported range request: ${reason}`,
  });

export const UnexpectedError = (reason: string): ResponseError =>
  new ResponseError({
    status: 500,
    reason: reason,
  });

export const NotModified = (headers: Headers): Response =>
  new Response(undefined, {
    status: 304,
    headers,
  });

export const PartialContent = (
  body: ReadableStream,
  headers: Headers
): Response =>
  new Response(body, {
    status: 206,
    headers,
  });

export const Ok = (
  body: ReadableStream | string | undefined,
  headers: Headers
): Response =>
  new Response(body, {
    status: 200,
    headers,
  });
