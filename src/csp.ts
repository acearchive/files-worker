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
  PrefetchSrc: "prefetch-src",
  NavigateTo: "navigate-to",
} as const;

const Src = {
  None: "'none'",
  Self: "'self'",
  UnsafeInline: "'unsafe-inline'",
  Https: "https:",
  AceArchive: "https://acearchive.lgbt",
} as const;

type CSP = Readonly<
  Record<
    typeof Directive[keyof typeof Directive],
    ReadonlyArray<typeof Src[keyof typeof Src]>
  >
>;

const csp: CSP = {
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
  [Directive.StyleSrc]: [Src.Self, Src.UnsafeInline, Src.AceArchive],

  // HTML documents are expected to be self-contained and any assets they need
  // to reference (style sheets, images, etc.) are expected to be included in
  // the artifact with them.
  [Directive.ImgSrc]: [Src.Self],

  // We host CSS on the main site for writing transcripts.
  [Directive.FontSrc]: [Src.Self, Src.AceArchive],

  [Directive.MediaSrc]: [Src.Self],

  [Directive.FrameSrc]: [Src.None],

  [Directive.FormAction]: [Src.None],

  // This domain is intended for serving static assets that may benefit from
  // embedding and for which there is limited opportunity for clickjacking.
  // A user should NEVER have cause to enter sensitive information into a page
  // under this domain.
  [Directive.FrameAncestors]: [Src.Https],

  [Directive.BaseUri]: [Src.Self],

  // We host CSS on the main site for writing transcripts.
  [Directive.PrefetchSrc]: [Src.Self, Src.AceArchive],

  // There are cases where an artifact file may want to navigate back to the
  // main site, such as to provide a link to its artifact page.
  [Directive.NavigateTo]: [Src.Self, Src.AceArchive],
};

export default Object.entries(csp)
  .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
  .join("; ");
