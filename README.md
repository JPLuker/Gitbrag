# Gitbrag

Gitbrag is a lightweight GitHub Pages dashboard for exploring a public GitHub profile, recent contribution activity, customized shareable profile pages, and exportable social images.

**v0.8.0** adds the rebuilt 1:1 PNG generator and a shorter static share-link format. The shared webpage renderer and PNG renderer remain completely separate.

## Current features

- Search by GitHub username or paste a `github.com/username` profile URL.
- Open a profile directly with a hash route such as `#/octocat`.
- Browse contribution activity for 24H, 7D, 1M, 6M, 1Y, and all available history.
- View contributions, active days, best day, and longest streak for the selected period.
- View public repository count, stars across loaded original repositories, followers, following, and account age.
- View a date-safe contribution heatmap for the last year.
- View up to six top original public repositories, ranked by stars.
- Exclude forked repositories from repository rankings and loaded-repository star totals.
- Derive an accent color from the profile avatar when browser canvas access permits it.
- Build a customized share link with a versioned configuration stored in the URL fragment.
- Open shared links as responsive HTML pages with independently configurable sections, stats period, calendar range, selected repositories, text size, accent, and card style.
- Generate a dedicated 1080 × 1080 PNG using a canvas renderer that does not depend on the shared-page renderer.
- Customize PNG modules, stats period, calendar range, up to four repositories, text size, accent, and card style.
- Preview the exact canvas that is exported as the PNG.
- Run entirely as a static site with no Gitbrag backend or database.

## Architecture

Gitbrag intentionally keeps the application small and static:

- `index.html` contains the semantic application structure and modal shells.
- `style.css` contains the core design system and responsive application layout.
- `share-page.css` contains only shared-webpage refinements.
- `png.css` contains only PNG-generator UI styling.
- `app.js` owns routing, public data loading, calculations, the main profile UI, and creation of renderer-neutral view models.
- `share-config.js` owns the versioned configuration schema, normalization, validation, compact URL-safe encoding, and backward-compatible decoding.
- `share-page.js` owns only the custom-link builder UI and responsive HTML shared-page renderer.
- `png.js` owns only the image-builder UI, 1080 × 1080 canvas renderer, preview, and PNG download path.

### Renderer boundary

The shared-page renderer produces responsive HTML.

The PNG renderer draws directly to a fixed 1080 × 1080 canvas. It does not clone the shared page, screenshot the main application, or reuse shared-page DOM/CSS.

The two renderers may consume the same validated configuration and renderer-neutral data model, but they do not call or wrap one another.

## Share links

New share links use a compact route:

```text
https://example.github.io/Gitbrag/#/octocat?s=<token>
```

The v1 configuration semantics are unchanged, but new tokens are serialized as a compact positional payload before URL-safe Base64 encoding. This makes links substantially shorter without requiring a database or third-party URL shortener.

Older v1 links using the original verbose JSON token and `?share=` parameter continue to decode.

A true short-link slug such as `/abc123` would require persistent server-side storage or an external shortener. Gitbrag intentionally remains backend-free, so the compact token format is the shortest self-contained option.

The configuration supports:

- Profile section on/off
- Stats section on/off
- Contribution calendar on/off
- Repository section on/off
- Stats period: 24H, 7D, 1M, 6M, 1Y, or all time
- Calendar range: 1M, 3M, 6M, 1Y, 2Y, or all available
- Up to four featured repositories
- Text size
- Accent
- Card style

Malformed or unsupported share tokens fall back to the normal profile and display an explanatory notice instead of breaking the application.

## PNG generation

The image generator is available from **Share → Generate image**.

PNG output is intentionally fixed to:

```text
1080 × 1080
1:1
PNG
```

The visible preview is the same canvas that is exported, so preview/export layout cannot drift because of DOM screenshot scaling.

Gitbrag branding is always drawn into the output.

## Data sources

### GitHub REST API

Basic profile and repository information comes directly from GitHub's public REST API.

Gitbrag requests up to three repository pages of 100 repositories each. Forks are removed before repository ranking and star aggregation. For accounts with more than 300 repositories, the displayed repository-star total may therefore be incomplete.

Because Gitbrag does not ask for a GitHub token, GitHub's unauthenticated API rate limits apply. Rate-limit failures are shown separately from a missing user.

### Contribution history

Contribution history comes from the public `github-contributions-api.jogruber.de` service.

If that service is unavailable, Gitbrag continues to show profile and repository information and explicitly marks contribution-dependent statistics and calendars as unavailable. It does not convert a service failure into fake zero-contribution data.

GitHub's own contribution rules determine the underlying public contribution graph.

## Routing

Normal profile:

```text
#/octocat
```

Customized shared profile:

```text
#/octocat?s=<token>
```

Legacy `?share=<token>` links are still accepted.

Both are client-side hash routes so direct links remain compatible with GitHub Pages.

## Tests

The share configuration has a Node-based regression test:

```bash
node tests/share-config.test.js
```

Syntax can be checked with:

```bash
node --check app.js
node --check share-page.js
node --check share-config.js
node --check png.js
```

## Run locally

No build step is required:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Canvas 2D API
- GitHub REST API
- Public GitHub contribution data
- GitHub Pages

## Roadmap to 1.0

- **0.6** — versioned share-config foundation
- **0.7** — responsive custom-link sharing
- **0.8** — isolated 1:1 PNG generator and compact share URLs
- **0.9** — social feature hardening and regression fixes
- **0.9.5** — marketing-focused front page that showcases Gitbrag's core, share-link, and PNG features
- **1.0** — stable Gitbrag release
