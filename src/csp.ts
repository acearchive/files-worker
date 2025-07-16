// We need to use the production Ace Archive URL instead of the one that matches
// the current environment because we can't access images/fonts/etc. behind
// Cloudflare Access.
//
// The images/fonts/etc. we're pulling from the static site must be kept in sync
// with it, if their paths ever change. Ideally we would somehow hook into its
// build pipeline to get those paths, but that's infeasible.
export const PROD_ARCHIVE_DOMAIN = "acearchive.lgbt";

const Directive = {
  DefaultSrc: "default-src",
  ScriptSrc: "script-src",
  StyleSrc: "style-src",
  ImgSrc: "img-src",
  FontSrc: "font-src",
  MediaSrc: "media-src",
  ObjectSrc: "object-src",
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

const csp: CSP = {
  // We set `default-src 'none'` because files under this domain may be
  // submitted by users. Most importantly, this disables all JavaScript.
  // While submissions do undergo manual review, making the CSP as strict as
  // possible reduces the potential risk if malicious files somehow slip past
  // manual review.
  [Directive.DefaultSrc]: [Src.None],

  // Technically redundant with the `default-src`, but important enough to be
  // explicit about.
  [Directive.ScriptSrc]: [Src.Self],

  // We host CSS on the main site for writing transcripts.
  [Directive.StyleSrc]: [
    Src.Self,
    Src.UnsafeInline,
    `https://${PROD_ARCHIVE_DOMAIN}`,
  ],

  // HTML documents are expected to be self-contained and any assets they need
  // to reference (style sheets, images, etc.) are expected to be included in
  // the artifact with them.
  [Directive.ImgSrc]: [Src.Self, `https://${PROD_ARCHIVE_DOMAIN}`],

  // We host CSS on the main site for writing transcripts.
  [Directive.FontSrc]: [Src.Self, `https://${PROD_ARCHIVE_DOMAIN}`],

  [Directive.MediaSrc]: [Src.Self],

  [Directive.ObjectSrc]: [Src.Self],

  [Directive.FrameSrc]: [Src.Self],

  [Directive.FormAction]: [Src.None],

  // This domain is intended for serving static assets that may benefit from
  // embedding and for which there is limited opportunity for clickjacking.
  // A user should NEVER have cause to enter sensitive information into a page
  // under this domain.
  [Directive.FrameAncestors]: [Src.Self, Src.Https],

  [Directive.BaseUri]: [Src.Self],
};

export default Object.entries(csp)
  .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
  .join("; ");
