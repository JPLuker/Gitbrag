# Gitbrag

Gitbrag is a lightweight GitHub Pages dashboard for exploring a public GitHub profile and its recent contribution activity.

The **0.6.x** line starts the social-feature rebuild on top of the stabilized 0.5.x core. The first milestone is deliberately infrastructure-only: a versioned share configuration format is now in place, but the share-link UI and PNG generator are not reintroduced yet.

## Current features

- Search by GitHub username or paste a `github.com/username` profile URL.
- Open a profile directly with a hash route such as `#/octocat`.
- Browse contribution activity for:
  - 24H (the current daily contribution bucket; GitHub's public graph does not expose contribution timestamps)
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
- Run entirely as a static site with no Gitbrag backend or database.

## Architecture

Gitbrag intentionally uses a small static architecture:

- `index.html` contains the semantic application structure.
- `style.css` contains the design system, responsive layout, and component styling.
- `app.js` owns routing, public data loading, calculations, rendering, and interaction state.
- `share-config.js` owns the versioned, validated configuration format that future link sharing and PNG export can consume independently.
- `tests/share-config.test.js` contains framework-free Node regression tests for that configuration layer.

There is no build step and no framework dependency.

### Social architecture rule

Shared webpages and exported images will use the same validated configuration data, but **they will not share a renderer or layout system**.

The intended separation is:

```text
share config
   ├── responsive shared-page renderer
   └── isolated PNG renderer
```

The share-link path must never depend on image dimensions, export DOM, transform scaling, or PNG-specific CSS. The PNG path must never be responsible for rendering the shared webpage.

## Share configuration — v1

Version `1` of the configuration foundation is available through `window.GitbragShareConfig` in the browser.

The normalized shape is:

```js
{
  v: 1,
  modules: {
    profile: true,
    stats: true,
    calendar: true,
    repos: true
  },
  statsPeriod: 'month',
  calendarRange: '6m',
  selectedRepos: [],
  appearance: {
    textSize: 'balanced',
    accent: 'auto',
    cardStyle: 'solid'
  }
}
```

The configuration layer provides:

- defaults
- normalization and enum validation
- module visibility validation
- deduplicated repository selection capped at four repositories
- URL-safe UTF-8 Base64 encoding
- strict decoding with explicit version checks
- safe `tryDecode()` fallback for untrusted links

Unsupported future config versions are rejected instead of being silently interpreted as the current format.

### Test the share configuration

No test framework is required:

```bash
node tests/share-config.test.js
```

## Data sources

### GitHub REST API

Basic profile and repository information comes directly from GitHub's public REST API.

Gitbrag requests up to three repository pages of 100 repositories each. Forks are removed before repository ranking and star aggregation. For accounts with more than 300 repositories, the displayed repository-star total may therefore be incomplete.

Because Gitbrag does not ask for a GitHub token, GitHub's unauthenticated API rate limits apply. Rate-limit failures are shown separately from a missing user.

### Contribution history

Contribution history comes from the public `github-contributions-api.jogruber.de` service.

If that service is unavailable, Gitbrag continues to show profile and repository information and explicitly marks contribution-dependent statistics and the calendar as unavailable. It does not convert a service failure into fake zero-contribution data.

GitHub's own contribution rules determine the underlying public contribution graph.

## Routing

Profiles use a client-side hash route:

```text
https://example.github.io/Gitbrag/#/octocat
```

This keeps direct profile links compatible with GitHub Pages without requiring server-side routing.

The custom share-link route will be added in the 0.7 milestone after the configuration layer is considered stable.

## Run locally

No build step is required. Serve the repository with any static HTTP server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Opening `index.html` directly may work for basic UI inspection, but serving it over HTTP better matches GitHub Pages behavior and avoids browser restrictions around network and canvas operations.

## GitHub Pages

Gitbrag is designed to deploy from the repository root on GitHub Pages.

1. Open the repository's **Settings**.
2. Open **Pages**.
3. Deploy from the `main` branch and repository root.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- GitHub REST API
- Public GitHub contribution data
- GitHub Pages

## Roadmap to 1.0

- **0.6** — versioned share configuration foundation
- **0.7** — responsive custom link sharing
- **0.8** — isolated 1:1 PNG generator
- **0.9** — social-feature hardening and regression fixes
- **1.0** — stable core + link sharing + PNG export
