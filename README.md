# Gitbrag

Gitbrag is a lightweight, GitHub Pages-friendly dashboard that turns a GitHub profile into a polished, shareable stats page.

## What it does

- Search by GitHub username or paste a GitHub profile URL
- Share a generated profile with a URL hash, including browser back/forward navigation
- Create a custom share link that preserves the same PNG configuration: modules, repositories, calendar range, ratio, text size, accent, card style, and display options
- Open a custom share link directly into a responsive shared-card view with PNG download and a path back to customization
- View 24H, 7D, 1M, 6M, 1Y, and lifetime contribution stats
- Show GitHub contribution totals, active days, best day, and streaks using one consistent date window
- Show a custom contribution heatmap with date-safe calendar keys
- Show public repositories, stars, followers, account age, and repository details
- Exclude forked repositories from repository rankings and repository-star totals
- Automatically derives the page accent/theme from the user's profile picture when the browser permits canvas access
- Build a shareable PNG entirely in the browser
- Choose which PNG modules to include: profile, stats, contribution calendar, repositories, and Gitbrag branding
- Choose the calendar range independently: 1 month, 3 months, 6 months, 1 year, 2 years, or all available
- Choose PNG canvas ratios: 1:1, 4:5, 9:16, 16:9, 1.91:1, and 2:3
- Preview uses the same native-size card layout that is exported, scaled only for display
- Text size, accent, card style, repository details, and profile alignment are configurable
- Runs as a static site with no database or self-hosted server

## Custom share links

A custom share link is generated from the PNG builder with **Copy share link**. The configuration is encoded into the URL fragment, so Gitbrag does not need a database to store the customization. The recipient's browser decodes the configuration, loads the public GitHub data, and reconstructs the same card.

The link preserves:

- PNG ratio
- Enabled modules
- Selected repositories
- Calendar range
- Avatar and username visibility
- Profile alignment
- Individual stats
- Repository name, description, stars, and language visibility
- Repository label
- Text size
- Accent
- Card style

The share format is versioned (`v1`) so the configuration format can evolve without silently breaking older links.

## PNG layouts

| Ratio | Size | Typical use |
|---|---:|---|
| 1:1 | 1080 × 1080 | Square social posts |
| 4:5 | 1080 × 1350 | Portrait social feeds |
| 9:16 | 1080 × 1920 | Stories and vertical video covers |
| 16:9 | 1920 × 1080 | Landscape graphics |
| 1.91:1 | 1200 × 628 | Wide social/link previews |
| 2:3 | 1000 × 1500 | Pinterest-style pins |

These are image-ratio presets, not guarantees about a particular platform's current UI requirements.

## Architecture

Gitbrag is intentionally a static browser application. `app.js` owns profile data, contribution statistics, routing, and the main profile UI. `png.js` owns the PNG builder, customization state, share-link serialization, shared-card rendering, preview, and export path.

The PNG card is built at its final native pixel dimensions. The preview and shared-card view create scaled clones of that exact card, while export captures the native card. The composition does not use container-query units, so preview and export do not depend on a renderer implementing CSS container queries.

Custom share configurations live in the URL fragment rather than a Gitbrag database. This keeps the feature compatible with GitHub Pages and means there is no server-side share state to maintain.

PNG export uses `modern-screenshot` 4.7.0 rather than the older html2canvas pipeline. The library is loaded from a pinned CDN version.

## Data and limitations

Gitbrag only requests publicly available data from the browser. It does not ask users for a GitHub token and does not store user data.

Basic profile and repository information comes from GitHub's public REST API. Contribution history comes from the public `github-contributions-api.jogruber.de` service. GitHub's own contribution rules determine the underlying public contribution graph.

Unauthenticated GitHub API access is rate limited. Gitbrag reports rate-limit failures separately from a genuinely missing GitHub user.

Repository discovery currently loads up to 300 repositories (three pages of 100) and filters forks before calculating repository rankings and displayed star totals. The displayed repository-star total therefore means stars across the loaded non-fork repositories, not necessarily every repository owned by an account with more than 300 repositories.

PNG generation is entirely client-side. Nothing is uploaded to a Gitbrag server when a user creates an image.

## Run locally

No build step is required. Open `index.html` in a browser or serve the folder with any static web server.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Gitbrag is designed to run directly from GitHub Pages. Enable **Pages** and deploy the `main` branch from the repository root.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- GitHub REST API
- GitHub public contribution data
- modern-screenshot 4.7.0
- GitHub Pages
