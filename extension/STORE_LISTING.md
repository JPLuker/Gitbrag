# Chrome Web Store draft

## Name

Gitbrag for GitHub

## Short description

See your Gitbrag activity snapshot directly on public GitHub profile pages.

## Detailed description

Gitbrag for GitHub adds a compact Gitbrag overlay to public GitHub profiles. It brings the core Gitbrag experience into GitHub without requiring an account, GitHub token, or access to private repositories.

The overlay defaults to the current calendar month and includes the same low-friction calendar/rolling activity model as Gitbrag: browse months with previous/next controls or choose a calendar month/year, 24H, 7D, 30D, 60D, 6M, 1Y, or All Time.

It shows contributions, active days, best day, longest streak, a synchronized contribution heatmap, public repository count, repository stars, followers, following, account age, and top original public repositories. **Open in Gitbrag** takes you to the full dashboard for sharing, PNG generation, and embeds.

Features:

- Automatic Gitbrag overlay on public GitHub profile pages
- Current-month-first calendar navigation
- Calendar month/year and rolling activity periods
- Contribution summary plus synchronized heatmap
- Public profile summary and top original repositories
- GitHub light/dark theme-aware styling
- Local 15-minute cache to reduce repeated API requests
- Enable/disable control, default-period setting, cache clearing, and retry states
- Direct access to the full Gitbrag profile

## Permission rationale

### storage

Used for the user's extension preferences and a short-lived local cache of public profile data.

### https://api.github.com/*

Used to retrieve basic public GitHub profile and repository metadata.

### https://github-contributions-api.jogruber.de/*

Used to retrieve public GitHub contribution history.

The extension does not request tabs, history, cookies, identity, private repository, or broad arbitrary-site permissions.

## Store assets still requiring browser testing / final branding

- 128 × 128 product icon
- 16/32/48 icons for packaged extension polish
- At least one Chrome Web Store screenshot
- Final screenshot showing the actual overlay placement on GitHub
- Optional promotional images

Do not create store screenshots until the live GitHub placement and responsive behavior have passed the repository `FINAL-TEST.md` gate.
