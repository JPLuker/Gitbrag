# Gitbrag

Gitbrag is a lightweight, GitHub Pages-friendly dashboard that turns a GitHub profile into a Spotify Wrapped-style stats page.

## What it does

- Search by GitHub username
- Paste a GitHub profile URL
- Share a generated profile with a URL hash
- View 24H, 7D, 1M, 6M, 1Y, and lifetime contribution stats
- Show GitHub contribution totals, active days, best day, and streaks
- Show a custom contribution heatmap
- Show public repositories, stars, followers, account age, and repository details
- Automatically derives the page accent/theme from the user's profile picture when the browser permits canvas access
- Build a shareable PNG in the browser
- Choose which PNG modules to include: profile, headline, stats, contribution calendar, repositories, and branding
- Runs as a static site with no database or self-hosted server

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
