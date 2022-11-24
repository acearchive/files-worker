export type RangeRequest =
  | { kind: "until-end"; offset: number }
  | { kind: "inclusive"; offset: number; end: number; length: number }
  | { kind: "suffix"; suffix: number }
  | { kind: "whole-document" };

export type PartialRangeRequest = Exclude<
  RangeRequest,
  { kind: "whole-document" }
>;

export type ParseRangeRequestResponse =
  | { isValid: true; range: Readonly<RangeRequest> }
  | { isValid: false; reason: string };

export const parseRangeRequest = (
  headers: Headers
): ParseRangeRequestResponse => {
  const encoded = headers.get("Range");

  if (encoded === null || encoded.trim().length === 0) {
    return {
      isValid: true,
      range: { kind: "whole-document" },
    };
  }

  const [unit, encodedRanges] = encoded.split("=");

  if (unit.trim() !== "bytes") {
    console.log("Request `Range` header included a unit other than `bytes`.");
    return {
      isValid: false,
      reason: "units other than `bytes` are not supported",
    };
  }

  const encodedRangeList = encodedRanges.split(",");

  if (encodedRangeList.length > 1) {
    console.log(
      "Client requested more than one range in the `Range` header. Only going to attempt to return the first."
    );
  }

  const [rangeStart, rangeEnd] = encodedRangeList[0].split("-");

  if (rangeStart.length === 0 && rangeEnd.length === 0) {
    console.log("Could not parse request `Range` header.");
    return { isValid: false, reason: "failed to parse request header" };
  } else if (rangeStart.length === 0) {
    return {
      isValid: true,
      range: { kind: "suffix", suffix: Number(rangeEnd) },
    };
  } else if (rangeEnd.length === 0) {
    return {
      isValid: true,
      range: { kind: "until-end", offset: Number(rangeStart) },
    };
  } else {
    return {
      isValid: true,
      range: {
        kind: "inclusive",
        offset: Number(rangeStart),
        end: Number(rangeEnd),
        length: Number(rangeEnd) + 1 - Number(rangeStart),
      },
    };
  }
};

// This SO answer has some excellent examples for how HTTP range headers should
// be formatted:
//
// https://stackoverflow.com/a/8507991

export const toContentRangeHeaderValue = (
  request: PartialRangeRequest,
  totalSize: number
): string => {
  switch (request.kind) {
    case "until-end":
      return `bytes ${request.offset}-${totalSize - 1}/${totalSize}`;
    case "inclusive":
      return `bytes ${request.offset}-${request.end}/${totalSize}`;
    case "suffix":
      return `bytes ${totalSize - request.suffix}-${
        totalSize - 1
      }/${totalSize}`;
  }
};

export const toR2Range = (request: RangeRequest): R2Range | undefined => {
  switch (request.kind) {
    case "until-end":
      return { offset: request.offset };
    case "inclusive":
      return { offset: request.offset, length: request.length };
    case "suffix":
      return { suffix: request.suffix };
    case "whole-document":
      return undefined;
  }
};
