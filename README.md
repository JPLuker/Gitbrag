# Gitbrag

Gitbrag is a lightweight, GitHub Pages-friendly dashboard that turns a GitHub profile into a polished, shareable stats page.

## What it does

- Search by GitHub username
- Paste a GitHub profile URL
- Share a generated profile with a URL hash
- View 24H, 7D, 1M, 6M, 1Y, and lifetime contribution stats
- Show GitHub contribution totals, active days, best day, and streaks
- Show a custom contribution heatmap
- Show public repositories, stars, followers, account age, and repository details
- Automatically derives the page accent/theme from the user's profile picture when the browser permits canvas access
- Build a shareable PNG entirely in the browser
- Choose which PNG modules to include: profile, stats, contribution calendar, repositories, and Gitbrag branding
- Selected modules automatically distribute themselves through the available card space instead of leaving large empty areas
- Gitbrag branding can be switched on or off
- Choose social-ready PNG canvases for square, portrait, story, landscape, wide social previews, and Pinterest pins
- Runs as a static site with no database or self-hosted server

## PNG layouts

Gitbrag currently provides these export presets:

| Preset | Size | Typical use |
|---|---:|---|
| Square | 1080 × 1080 | Instagram / LinkedIn square posts |
| Portrait | 1080 × 1350 | Instagram / Facebook / LinkedIn feeds |
| Story | 1080 × 1920 | Instagram Stories / TikTok / YouTube Shorts |
| Landscape | 1920 × 1080 | YouTube / X |
| Wide | 1200 × 628 | LinkedIn and social link previews |
| Pinterest | 1000 × 1500 | Standard Pinterest pins |

The exact platform UI can change over time, so these are practical social-ready presets rather than guarantees about every placement.

## Run locally

No build step is required. Open `index.html` in a browser or serve the folder with any static web server.

For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Gitbrag is designed to run directly from GitHub Pages. In the repository settings, enable **Pages** and deploy the `main` branch from the repository root.

## Data and limitations

Gitbrag only requests publicly available data from the browser. It does not ask users for a GitHub token and does not store user data.

Basic profile and repository information comes from GitHub's public REST API. Contribution history comes from the public `github-contributions-api.jogruber.de` service, which retrieves the contribution history shown by public GitHub profiles and caches results. This avoids hammering GitHub's restrictive unauthenticated search endpoints and gives Gitbrag historical contribution data instead of pretending the recent Events API contains a full history.

The contribution API is a third-party service, so its availability and caching are outside Gitbrag's control. GitHub's own contribution rules still determine the underlying public contribution graph.

PNG generation is entirely client-side using html2canvas. Nothing is uploaded to a server when a user creates an image.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- GitHub REST API
- GitHub public contribution data
- html2canvas
- GitHub Pages
