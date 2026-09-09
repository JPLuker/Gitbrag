# Gitbrag

Gitbrag is a lightweight GitHub Pages dashboard for exploring a public GitHub profile, contribution activity, and a customized shareable profile page.

**v0.7.0** introduces the rebuilt custom-link sharing system. The shared experience is a normal responsive webpage. It does not use an image canvas or PNG renderer.

## Current features

- Search by GitHub username or paste a `github.com/username` profile URL.
- Open a profile directly with a hash route such as `#/octocat`.
- Browse contribution activity for:
  - 24H
  - 7D
  - 1 month
  - 6 months
  - 1 year
  - all available history
- View contributions, active days, best day, and longest streak for the selected period.
- View public repository count, stars across loaded original repositories, followers, following, and account age.
- View a date-safe contribution heatmap for the last year.
- View up to six top original public repositories, ranked by stars.
- Exclude forked repositories from repository rankings and loaded-repository star totals.
- Derive an accent color from the profile avatar when browser canvas access permits it.
- Build a customized share link with a versioned configuration stored in the URL fragment.
- Open shared links as responsive HTML pages with independently configurable sections, stats period, calendar range, selected repositories, text size, accent, and card style.
- Run entirely as a static site with no Gitbrag backend or database.

## Architecture

Gitbrag intentionally keeps the application small and static:

- `index.html` contains the semantic application structure.
- `style.css` contains the design system, responsive layout, share dialog, and shared-page styles.
- `app.js` owns routing, public data loading, calculations, rendering of the main profile, and creation of share-page view models.
- `share-config.js` owns the versioned share configuration schema, normalization, validation, and URL-safe encoding/decoding.
- `share-page.js` owns only the custom-link builder UI and responsive shared-page renderer.

### Renderer boundary

The shared-page renderer is a webpage renderer. It produces responsive HTML only.

The planned PNG generator will be a separate renderer with its own image-export DOM and CSS. The two systems may share public data, validated configuration, and calculation utilities, but they will not share a renderer or fixed-size layout.

There are no runtime function overrides or compatibility wrappers between the share system and the main application.

## Share links

A share link looks like:

```text
https://example.github.io/Gitbrag/#/octocat?share=<token>
```

The token contains a normalized v1 configuration. No share state is stored on a Gitbrag server.

The current configuration supports:

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
#/octocat?share=<token>
```

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
- GitHub REST API
- Public GitHub contribution data
- GitHub Pages

## Roadmap to 1.0

- **0.6** — versioned share-config foundation
- **0.7** — responsive custom-link sharing
- **0.8** — isolated 1:1 PNG generator
- **0.9** — social feature hardening and regression fixes
- **1.0** — stable Gitbrag release
