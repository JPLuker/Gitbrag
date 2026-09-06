# Gitbrag

Gitbrag is a lightweight, GitHub Pages-friendly dashboard that turns a GitHub profile into a Spotify Wrapped-style stats page.

## What it does

- Search by GitHub username
- Paste a GitHub profile URL
- Share a generated profile with a URL hash
- View 24H, 7D, 1M, 6M, 1Y, and lifetime stats
- Count public commits, pull requests, and issues with GitHub's search APIs
- Show recent public review activity
- Show the user's GitHub contribution calendar
- Show public repositories, stars, followers, account age, and repository details
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

Gitbrag only requests publicly available GitHub data from the browser. It does not ask users for a GitHub token and does not store user data.

Commit, pull-request, and issue counts are calculated with GitHub's public REST search APIs. They are useful public-activity counts, but they are not guaranteed to exactly match GitHub's own contribution graph because GitHub applies additional contribution rules.

GitHub's public Events API is intentionally limited to recent activity, so Gitbrag does not pretend that it can derive historical review/push-event totals from that endpoint. The contribution calendar is displayed directly from GitHub's public profile contribution graphic.

Public GitHub API rate limits also apply. If a visitor makes many searches in a short period, GitHub may temporarily reject requests.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- GitHub REST API
- GitHub public contribution graph
- GitHub Pages
