const Directive = {
  DefaultSrc: "default-src",
  ScriptSrc: "script-src",
  StyleSrc: "style-src",
  ImgSrc: "img-src",
  FontSrc: "font-src",
  MediaSrc: "media-src",
  FrameSrc: "frame-src",
  FormAction: "form-action",
  FrameAncestors: "frame-ancestors",
  BaseUri: "base-uri",
} as const;

const Src = {
  None: "'none'",
  Self: "'self'",
  UnsafeInline: "'unsafe-inline'",
  Https: "https:",
} as const;

type CSP = Readonly<
  Record<typeof Directive[keyof typeof Directive], ReadonlyArray<string>>
>;

const newCsp = (archiveDomain?: string): CSP => {
  const archiveSources = archiveDomain ? [`https://${archiveDomain}`] : [];

  return {
    // We set `default-src 'none'` because files under this domain may be
    // submitted by users. Most importantly, this disables all JavaScript.
    // While submissions do undergo manual review, making the CSP as strict as
    // possible reduces the potential risk if malicious files somehow slip past
    // manual review.
    [Directive.DefaultSrc]: [Src.None],

    // Technically redundant with the `default-src`, but important enough to be
    // explicit about.
    [Directive.ScriptSrc]: [Src.None],

    // We host CSS on the main site for writing transcripts.
    [Directive.StyleSrc]: [Src.Self, Src.UnsafeInline, ...archiveSources],

    // HTML documents are expected to be self-contained and any assets they need
    // to reference (style sheets, images, etc.) are expected to be included in
    // the artifact with them.
    [Directive.ImgSrc]: [Src.Self, ...archiveSources],

    // We host CSS on the main site for writing transcripts.
    [Directive.FontSrc]: [Src.Self, ...archiveSources],

    [Directive.MediaSrc]: [Src.Self],

    [Directive.FrameSrc]: [Src.None],

    [Directive.FormAction]: [Src.None],

    // This domain is intended for serving static assets that may benefit from
    // embedding and for which there is limited opportunity for clickjacking.
    // A user should NEVER have cause to enter sensitive information into a page
    // under this domain.
    [Directive.FrameAncestors]: [Src.Https],

    [Directive.BaseUri]: [Src.Self],
  };
};

const buildCsp = (archiveDomain?: string): string =>
  Object.entries(newCsp(archiveDomain))
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");

export default buildCsp;
