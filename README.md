# Gitbrag

Gitbrag is a lightweight GitHub Pages dashboard for exploring a public GitHub profile and its recent contribution activity.

Version **0.5.0** is a cleanup release. The app was reduced back to its core profile/statistics experience so the codebase can stabilize before social sharing and image-generation features are revisited.

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

There is no build step and no framework dependency.

The 0.5.0 cleanup removed the previous PNG/share-link implementation entirely. Social features are intentionally deferred until the core application is stable enough to support them without coupling webpage rendering to image-export logic.

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

## 1.0 direction

The current priority is correctness, stability, responsive behavior, and maintainable code. Social sharing and image-generation features can be reintroduced after the core application is considered stable, with separate architectures for webpage sharing and image export.
