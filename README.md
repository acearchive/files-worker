# files-worker

This repo is a [Cloudflare Worker](https://developers.cloudflare.com/workers/)
that serves artifact files hosted on Ace Archive from [Cloudflare
R2](https://developers.cloudflare.com/r2).

Artifact metadata is stored in a [Cloudflare
D1](https://developers.cloudflare.com/d1) SQLite database. This worker handles
incoming `GET` and `HEAD` requests to `https://files.acearchive.lgbt`, reads the
metadata for the artifact from the database, and then serves the file contents
from R2.

This worker handles requests of the form:

```
https://files.acearchive.lgbt/artifacts/<artifact_slug>/<file_name>
```

The artifact metadata in the database is populated by
[acearchive/artifact-submit-action](https://github.com/acearchive/artifact-submit-action).
Requesting this metadata in this worker is necessary because objects in R2 are
keyed by their hash (more specifically a
[multihash](https://multiformats.io/multihash/)), so we need to get the hash of
the file first.

HTTP range requests and conditional requests are supported, and `ETag` and
`Last-Modified` headers are returned for caching.
