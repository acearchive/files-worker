import {
  PartialRangeRequest,
  RangeRequest,
  toContentRangeHeaderValue,
} from "./range";
import contentSecurityPolicy from "./csp";
import { decodeMultihash, hashAlgorithmToReprDigestName } from "./multihash";
import { base64 } from "rfc4648";

export const Header = {
  Allow: "Allow",
  Range: "Range",
  ETag: "ETag",
  ReprDigest: "Repr-Digest",
  LastModified: "Last-Modified",
  ContentLength: "Content-Length",
  ContentType: "Content-Type",
  ContentRange: "Content-Range",
  AcceptRanges: "Accept-Ranges",
  IfMatch: "If-Match",
  IfNoneMatch: "If-None-Match",
  ContentTypeOptions: "X-Content-Type-Options",
  ContentSecurityPolicy: "Content-Security-Policy",
  ReferrerPolicy: "Referrer-Policy",
  StrictTransportSecurity: "Strict-Transport-Security",
  CacheControl: "Cache-Control",
  AccessControlAllowOrigin: "Access-Control-Allow-Origin",
  PermissionsPolicy: "Permissions-Policy",
  Vary: "Vary",
  Accept: "Accept",
} as const;

export const commonResponseHeaderMap: Readonly<Record<string, string>> = {
  [Header.AcceptRanges]: "bytes",

  [Header.ContentTypeOptions]: "nosniff",

  [Header.ContentSecurityPolicy]: contentSecurityPolicy,

  [Header.ReferrerPolicy]: "strict-origin",

  [Header.StrictTransportSecurity]: `max-age=${
    60 * 60 * 24 * 365
  }; includeSubDomains; preload`,

  [Header.CacheControl]: `public, max-age=${60 * 60 * 4}`,

  [Header.AccessControlAllowOrigin]: "*",

  // Explicitly forbid highly sensitive permissions.
  [Header.PermissionsPolicy]:
    "camera=(), microphone=(), geolocation=(), display-capture=()",
};

export const getCommonResponseHeaders = () => {
  const responseHeaders = new Headers();

  for (const [header, value] of Object.entries(commonResponseHeaderMap)) {
    responseHeaders.set(header, value);
  }

  return responseHeaders;
};

const toLastModifiedHeaderValue = (date: Date): string => {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const weekDay = weekDays[date.getUTCDay()];
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");

  return `${weekDay}, ${day} ${month} ${year} ${hour}:${minute}:${second} GMT`;
};

const toReprDigestHeaderValue = (multihash: string): string => {
  const { hash, hashAlgorithm } = decodeMultihash(multihash);
  const reprDigestName = hashAlgorithmToReprDigestName(hashAlgorithm);
  return `${reprDigestName}=:${base64.stringify(hash)}:`;
};

const toContentLengthHeaderValue = (
  request: PartialRangeRequest,
  totalSize: number
): string => {
  switch (request.kind) {
    case "until-end":
      return (totalSize - request.offset).toString();
    case "inclusive":
      return request.length.toString();
    case "suffix":
      return request.suffix.toString();
  }
};

export const getResponseHeaders = ({
  object,
  rangeRequest,
  multihash,
}: {
  object: R2Object;
  rangeRequest?: RangeRequest;
  multihash: string;
}): Headers => {
  const responseHeaders = getCommonResponseHeaders();

  object.writeHttpMetadata(responseHeaders);

  responseHeaders.set(Header.ETag, object.httpEtag);
  responseHeaders.set(
    Header.LastModified,
    toLastModifiedHeaderValue(object.uploaded)
  );

  if (rangeRequest === undefined || rangeRequest.kind === "whole-document") {
    responseHeaders.set(Header.ContentLength, object.size.toString());
  } else {
    responseHeaders.set(
      Header.ContentLength,
      toContentLengthHeaderValue(rangeRequest, object.size)
    );
    responseHeaders.set(
      Header.ContentRange,
      toContentRangeHeaderValue(rangeRequest, object.size)
    );
  }

  responseHeaders.set(Header.ReprDigest, toReprDigestHeaderValue(multihash));

  return responseHeaders;
};

export const parseConditionalHeaders = (headers: Headers): Headers => {
  // We need to match case-insensitively, because HTTP headers may not use
  // canonicalized casing.
  const etagHeaders = new Set(
    [Header.IfMatch, Header.IfNoneMatch].map((header) => header.toLowerCase())
  );

  const newHeaders = new Headers();

  // This is necessary because of a bug in the Workers runtime. This worker will
  // only ever return strong etags, but clients may make conditional HTTP
  // requests using weak etags, and currently R2 can't parse them.
  //
  // https://bytemeta.vip/repo/cloudflare/cloudflare-docs/issues/5469
  for (const [header, value] of headers.entries()) {
    if (etagHeaders.has(header.toLowerCase())) {
      const newValue = value.replace(new RegExp(`^W/`), "");
      newHeaders.set(header, newValue);
      console.log(
        `Rewriting \`${header}: ${value}\` to \`${header}: ${newValue}\``
      );
    } else {
      newHeaders.set(header, value);
    }
  }

  return newHeaders;
};

export const headersToDebugRepr = (
  banner: string,
  headers: Headers
): string => {
  return (
    `${banner}:\n` +
    Array.from(headers.entries())
      .map(([header, value]) => `  ${header}: ${value}`)
      .join("\n")
  );
};

const parseAcceptHeader = (header: string): string[] => {
  const mediaTypesWithWeights = header
    .split(",")
    .map((mediaType) => mediaType.trim());

  const mediaTypesByWeight = new Map(
    mediaTypesWithWeights.map((mediaTypeWithWeight) => {
      const [mediaType, weight] = mediaTypeWithWeight.split(";q=");
      return [mediaType, weight === undefined ? "1" : weight];
    })
  );

  return Array.from(mediaTypesByWeight.keys()).sort(
    (a, b) =>
      Number(mediaTypesByWeight.get(b)) - Number(mediaTypesByWeight.get(a))
  );
};

export const prefersHtmlOver = (
  acceptHeader: string,
  otherMediaType: string
) => {
  const mediaTypes = parseAcceptHeader(acceptHeader);
  const htmlIndex = mediaTypes.indexOf("text/html");
  const otherIndex = mediaTypes.indexOf(otherMediaType);
  const hasHtmlButNotOther = htmlIndex !== -1 && otherIndex === -1;

  return hasHtmlButNotOther || htmlIndex < otherIndex;
};
