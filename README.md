# Gitbrag

Gitbrag is a lightweight GitHub Pages app that turns public GitHub activity into a focused stats dashboard with share links, social PNGs, website embeds, and an optional Chrome extension.

**v0.9.10** licenses Gitbrag under MIT and completes the license notices. The preceding v0.9.9 update prepares the existing website and Chrome extension for the final 1.0 test gate. It bundles the existing Inter font locally, adds support/security documentation and links, and adds automated verification and draft-release packaging. The visual identity and feature scope remain unchanged.

**1.0 is not published yet.** Follow [release issue #1](https://github.com/JPLuker/Gitbrag/issues/1), [the audit](MAINTENANCE-AUDIT.md), and [the browser checklist](FINAL-TEST.md).

## Current features

- Search by GitHub username or paste a `github.com/username` profile URL.
- Open a profile directly with a hash route such as `#/octocat`.
- Open profiles on the current calendar month by default, with the contribution calendar following the same month.
- Move between calendar months with previous/next arrows, or tap the current period to choose a month, year, or rolling window.
- View contributions, active days, best day, longest streak, public repositories, repository stars, followers, following, and account age.
- View a contribution heatmap and ranked original public repositories.
- Build configurable responsive share links with a compact versioned URL token.
- Preserve dated month/year selections in share links and website embeds.
- Generate a dedicated 1080 × 1080 social PNG from an isolated Canvas 2D renderer.
- Customize PNG modules, activity period, up to four repositories, text size, accent, and card style.
- Generate responsive website embed code from **Share → Embed**.
- Use the optional Manifest V3 Chrome extension to surface Gitbrag stats directly on public GitHub profile pages.
- Run the main website entirely as a static GitHub Pages app with no Gitbrag account backend or database.

## Landing page

The homepage is deliberately small and product-first:

- A Gitbrag hero with the primary GitHub username/profile-URL search.
- A short explanation of what Gitbrag does.
- An explicitly illustrative example dashboard preview so visitors can see the product before loading a profile.
- A restrained footer with project documentation plus creator links.
- Responsive desktop and mobile layouts.

The actual dashboard remains the primary place where users interact with Gitbrag's features.

## Activity periods

Gitbrag uses one activity-period control for both statistics and the contribution calendar.

The default view is the **current calendar month**. The left/right arrows step directly through available calendar months, while tapping the period label opens the full picker.

### Calendar periods

The compact picker provides quick access to:

- This month
- Previous month
- This year
- **Choose month…** for an older calendar month
- **Choose year…** for an older calendar year

Historical months use their exact calendar boundaries. Current month/year calculations stop at today, so future days are never included.

### Rolling periods

Rolling windows are secondary options in the same picker:

- 24 hours
- 7 days
- 30 days
- 60 days
- 6 months
- 1 year
- All available contribution history

Whichever period is selected drives contributions, active days, best day, longest streak, and the contribution calendar. The dashboard does not expose a second competing calendar-range control.

## Architecture

Gitbrag intentionally keeps its rendering paths separated:

- `index.html` — application structure, simplified landing page, profile views, and modal shells.
- `style.css` — core application/profile design system.
- `landing.css` — simplified landing-page presentation only.
- `landing.js` — lightweight landing-page visibility state used to hide the floating version badge while the landing page is active.
- `dated.css` — unified activity-period picker styling.
- `stats-period.js` — pure rolling/calendar-period parsing, labeling, date-window calculation, and record filtering.
- `dated-period.js` — period/calendar synchronization plus dated controls for share/PNG builders.
- `period-picker.js` — low-friction dashboard period stepper and compact calendar/rolling picker.
- `share-config.js` — versioned configuration schema, normalization, validation, compact encoding, and legacy decoding.
- `share-page.js` — responsive shared-webpage renderer and builder UI.
- `embed.js` — embed URL/code generation and iframe auto-height behavior.
- `png.css` — PNG-builder interface styling only.
- `png.js` — isolated fixed 1080 × 1080 Canvas renderer and export flow.
- `app.js` — routing, public-data loading, calculations, main profile rendering, and renderer-neutral view models.
- `extension/` — optional Manifest V3 Chrome extension and its own tests/documentation.

### Renderer boundary

The responsive share page and website embed use normal HTML. The PNG generator draws directly to its fixed 1080 × 1080 canvas. The PNG path does not clone, screenshot, or reuse the responsive shared-page DOM.

The Chrome extension is also independent of the website renderers. It injects its own compact card into GitHub and shares no DOM renderer with the site.

## Share links

New links use a compact route:

```text
https://example.github.io/Gitbrag/#/octocat?s=<token>
```

The configuration can control:

- Profile section
- Stats section
- Contribution calendar
- Repository section
- Rolling or calendar stats period
- One period drives both stats and the contribution calendar; legacy calendar-range data remains decode-compatible
- Up to four featured repositories
- Text size
- Accent
- Card style

Share-config schema v2 adds dated stats-period values while continuing to decode v1 compact and JSON tokens. Malformed or unsupported compact tokens fall back safely instead of breaking the app.

## PNG generation

PNG output is intentionally fixed to:

```text
1080 × 1080
1:1
PNG
```

The visible preview is the same canvas that is exported. The layout adapts to enabled sections, activity period, and repository count. The PNG contribution calendar uses the same selected period as the activity summary, including specific months/years and rolling windows. Contribution days are packed into a dense square-cell matrix for the social image, while the normal responsive webpage keeps its conventional calendar renderer.

Generated PNGs use a single enlarged Gitbrag wordmark in the top-right and retain the GitHub profile URL in the footer.

## Website embeds

The embed builder is available from **Share → Embed**. Embed URLs use the same compact configuration plus an embed flag:

```text
#/octocat?s=<token>&embed=1
```

The generated iframe can work by itself or with the included auto-height helper. The helper accepts resize messages only from the generated iframe and expected Gitbrag origin.

## Chrome extension

The optional extension lives in `extension/` and uses Manifest V3. v0.9.8 is the website-parity pass.

The GitHub overlay now includes:

- Current calendar month by default with the same **‹ period ›** month navigation pattern.
- Calendar month/year selection plus rolling 24H, 7D, 30D, 60D, 6M, 1Y, and All Time windows.
- Contributions, active days, best day, and longest streak.
- A contribution heatmap that follows the selected activity period.
- Public repositories, loaded-repository stars, followers, following, and account age.
- The top three original public repositories, ranked by stars using the same repository-loading rules as the website.
- A toolbar popup for enable/disable, default period, and cache clearing.
- Local short-lived caching, retry/error handling, and GitHub SPA/Turbo reinjection.
- GitHub light/dark theme-aware styling plus **Open in Gitbrag** for the full share/PNG/embed workflow.

The extension does not duplicate Share, PNG, or Embed controls inside GitHub. Those remain on the full Gitbrag site. It also does not request a GitHub token, private-repository access, cookies, tabs, identity, or browsing-history permissions.

To test locally:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the repository's `extension` directory.
5. Open a public GitHub profile.

## Data sources

Basic profile and repository information comes from the public GitHub REST API. Gitbrag requests up to three repository pages of 100 repositories each for the full web dashboard and excludes forks from repository rankings/star aggregation.

Contribution history comes from `github-contributions-api.jogruber.de` and follows GitHub's public contribution graph. If contribution history cannot be loaded, Gitbrag keeps profile/repository data visible and marks contribution-dependent output unavailable rather than converting the failure to zero.

Because Gitbrag does not request a GitHub token, GitHub's unauthenticated API limits apply.

## Privacy

No telemetry, analytics, advertisements, or Gitbrag accounts. Gitbrag does not sell data. Looking up a public profile sends that username to the services below; those providers receive the request and normal connection information such as IP address. Do not interpret “public data only” as “no network requests.”

The website holds loaded profile data in page memory and does not use localStorage, cookies, or a profile database. Profile/share URLs can remain in browser history or be seen by anyone you send them to. PNGs go to your browser's chosen download location. Browser history, downloads, and HTTP caches are controlled by the browser.

The extension caches up to 50 public profiles in Chrome local extension storage. Entries expire after 15 minutes and are pruned when the cache is accessed; expiry is not a promise of a background deletion timer. Clear them with **Clear cached profiles**. Enable/default-period preferences use Chrome sync storage; Chrome may synchronize these through the user's browser account. Disabling the overlay stops further automatic lookups. Uninstalling removes extension-managed data according to Chrome's behavior. There are no credentials or private-repository tokens to export.

### Network connections

| Host | When | What's sent |
|---|---|---|
| `jpluker.github.io` | Opening the website or **Open in Gitbrag** | Static page/asset requests and normal connection metadata. Route/share data lives in the URL fragment, which is not sent in the HTTP request. |
| `api.github.com` | Website profile lookup; enabled extension on public profiles | Requested public username and repository pagination parameters. No Gitbrag access token. |
| `github-contributions-api.jogruber.de` | The same profile lookup | Requested public username and history selector. |
| `avatars.githubusercontent.com` | Website profile/share rendering and PNG/avatar-color loading | Public avatar URL returned by GitHub and normal image request metadata. |

Google Fonts is not contacted: Inter is bundled locally under its [SIL Open Font License](assets/fonts/OFL.txt). No remote scripts or decorative CDN assets are loaded. Chrome's own preference synchronization and extension distribution are browser-managed services, not Gitbrag's own API calls. External footer links are ordinary user-opened links, not background connections.

See [extension privacy](extension/PRIVACY.md) for the extension-specific disclosure.

## Support

Issues are monitored. [Report bugs or request features](https://github.com/JPLuker/Gitbrag/issues/new/choose). The 1.0 feature scope is frozen. After stable release, maintenance covers bugs, security and compatibility; new feature requests do not imply planned development. New reports should be acknowledged within 7 days.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), never in public issues.

## License

Gitbrag is open source under the [MIT License](LICENSE), copyright © 2026 Joseph Luker. The bundled Inter font remains under its own [SIL Open Font License 1.1](assets/fonts/OFL.txt); its notice is preserved separately.

## Verification and release preparation

```bash
python3 scripts/verify.py
```

This runs the four existing suites, JS syntax checks, version consistency checks and local HTML asset checks. It does not prove real-browser behavior. Change `VERSION`, then run `python3 scripts/sync-version.py` to update the static website/cache/popup/manifest references together.

Tagged CI verifies the version and LICENSE, runs the checks, and prepares website/Chrome ZIPs plus `SHA256SUMS.txt` in a **draft** GitHub release. It never automatically publishes a stable release. Complete the manual gate before publishing. Local package runs are for inspection only; published assets come from tagged CI.

## Tests

```bash
node tests/stats-period.test.js
node tests/share-config.test.js
node extension/tests/core.test.js
node extension/tests/stats.test.js

node --check stats-period.js
node --check dated-period.js
node --check period-picker.js
node --check app.js
node --check share-page.js
node --check share-config.js
node --check embed.js
node --check png.js
node --check landing.js
node --check extension/core.js
node --check extension/background.js
node --check extension/stats.js
node --check extension/content.js
node --check extension/popup.js
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
- Chrome Extensions Manifest V3
- GitHub REST API
- Public GitHub contribution data
- GitHub Pages

## Roadmap to 1.0

- **0.6** — versioned share-config foundation
- **0.7** — responsive custom-link sharing
- **0.8** — isolated 1:1 PNG generator and compact share URLs
- **0.9** — social feature hardening and regression fixes
- **0.9.1** — configurable website embeds
- **0.9.2** — first-party Chrome extension
- **0.9.3** — extension pre-test hardening and store/privacy preparation
- **0.9.4 / 0.9.4.1** — PNG branding and rounded-corner cleanup
- **0.9.5** — full marketing landing page
- **0.9.6** — simplified launch landing page and creator/project footer
- **0.9.7** — dated calendar-month/year stats across dashboard, shares, embeds, and PNGs
- **0.9.7.1** — simplified date picker and automatic dated-calendar synchronization
- **0.9.7.2** — current-month default, simplified Month/Year/Rolling controls, and duplicate period-label cleanup
- **0.9.7.3** — single period stepper/picker with one-tap month navigation and rolling periods moved behind the picker
- **0.9.8** — Chrome extension parity pass: website-aligned periods, heatmap, profile summary, and top repositories
- **0.9.9** — nonvisual maintenance documentation, bundled font, verification and draft-release preparation
- **1.0** — final regression, documentation freeze, and stable release
