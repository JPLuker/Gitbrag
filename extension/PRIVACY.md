# Gitbrag for GitHub — Privacy

Gitbrag for GitHub is designed to work with public GitHub profile information only.

## Data the extension reads

When a public GitHub profile is open, the extension may request:

- Public GitHub profile and repository metadata from `api.github.com`.
- Public contribution history from `github-contributions-api.jogruber.de`.

The extension does not request a GitHub access token and does not access private repositories, private account data, cookies, passwords, or browsing history.

## Local storage

Recently viewed public profile results are cached in Chrome local extension storage for up to 15 minutes to reduce repeated API requests. The cache is limited to 50 profiles and expired entries are pruned automatically. Users can clear this cache from the extension popup.

Extension preferences such as whether the overlay is enabled and the default activity period are saved using Chrome sync storage when available.

## Data sharing and tracking

Gitbrag for GitHub does not include advertising, analytics, behavioral tracking, or a Gitbrag account system. It does not sell user data.

Requests are sent only to the public data services required to render the feature:

- GitHub REST API
- `github-contributions-api.jogruber.de`

Those services operate under their own policies.

## Removal

Disabling or uninstalling the extension stops the extension from loading Gitbrag overlays. Chrome removes extension-managed local data when the extension is uninstalled according to Chrome's storage behavior.

This document should be reviewed again before Chrome Web Store publication if analytics, accounts, new permissions, or additional external services are added.
