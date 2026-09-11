# Gitbrag — Final Manual Test Gate for 1.0

This file contains the checks that still require a real browser, live GitHub behavior, visual inspection, or failure-state simulation before Gitbrag can be tagged **v1.0.0**.

Automated/static checks should be run before this document is used. Do not mark an item complete unless it was actually tested.

---

## 1. Landing page

- [ ] Desktop: hero copy, search field, example dashboard preview, and footer look intentional.
- [ ] Desktop: hero heading has no overlapping letters at common widths.
- [ ] Tablet: layout stacks cleanly without clipped text or horizontal overflow.
- [ ] Small mobile: no horizontal scrolling; search field/button remain usable.
- [ ] Search by plain GitHub username routes into the profile.
- [ ] Search by `github.com/username` routes into the profile.
- [ ] **New user** returns to the simplified landing page.
- [ ] Footer links open the intended Gitbrag/creator destinations.
- [ ] The example dashboard remains clearly illustrative and is not mistaken for live user data.

---

## 2. Unified activity-period picker (v0.9.8 website / extension parity candidate)

### Main dashboard

- [ ] A newly loaded profile opens on the **current calendar month**.
- [ ] The activity period is presented as one compact control: **‹ [period] ›**.
- [ ] The period label shows a concise value such as **September 2026**, not a second mode name.
- [ ] The dashboard does not repeat the selected period beside both Activity Summary and Contribution Calendar.
- [ ] Previous-month arrow moves back exactly one available calendar month.
- [ ] Next-month arrow moves forward exactly one available calendar month.
- [ ] Next-month arrow is disabled on the current month.
- [ ] Previous-month arrow is disabled at the account's earliest available month.
- [ ] Arrows are disabled for yearly and rolling selections.
- [ ] Tapping the center period label opens a compact custom picker rather than a long native list.
- [ ] Picker quick actions show **This month**, **Previous month**, and **This year** with correct labels.
- [ ] **Choose month…** reveals only Month + Year + View controls.
- [ ] **Choose year…** reveals only Year + View controls.
- [ ] Future months/years are not offered.
- [ ] Picking a historical month such as **August 2026** uses exactly Aug 1–31.
- [ ] Picking a historical year uses exactly Jan 1–Dec 31.
- [ ] Current month/year stops at today; future days are not included.
- [ ] Rolling options include 24H, 7D, 30D, 60D, 6M, 1Y, and All time.
- [ ] Contributions are correct for calendar and rolling periods.
- [ ] Active days are correct for calendar and rolling periods.
- [ ] Best day is correct for calendar and rolling periods.
- [ ] Longest streak is correct for calendar and rolling periods.
- [ ] Contribution calendar always follows the same selected period as the stats.
- [ ] Clicking outside the picker closes it.
- [ ] Escape closes the picker and returns focus to the period button.
- [ ] Mobile picker stays within the viewport and does not cause horizontal scrolling.

### Share links

- [ ] Open **Share → Share link** from the current-month dashboard; the same calendar month is selected.
- [ ] Open Share while a historical month/year is selected; that exact period is preserved.
- [ ] Open Share while 30D/60D/etc. is selected; that rolling period is preserved.
- [ ] Stats-period dropdown stays short and offers **Specific month…** / **Specific year…** instead of listing every date.
- [ ] Choosing a specific month/year reveals compact date controls.
- [ ] The old independent Calendar range control is not presented as a competing choice.
- [ ] Shared activity summary and contribution calendar use the same selected period.
- [ ] The selected period appears once in the shared output, not once per section.
- [ ] Copying and reopening a calendar or rolling share link preserves the period.
- [ ] A v1 compact share token from pre-v0.9.7 still opens correctly.
- [ ] A legacy v1 JSON `?share=` token still opens correctly.
- [ ] Invalid/unsupported tokens fail safely and fall back to the full profile.

### PNG generator

- [ ] Open **Generate image** from the current month; the first preview uses that month.
- [ ] Open Generate image from a historical month/year; the preview preserves that exact period.
- [ ] Open Generate image from 60D or another rolling period; the preview preserves that rolling period.
- [ ] PNG Stats period selector stays short and offers **Specific month…** / **Specific year…**.
- [ ] The old independent Calendar range control is not presented as a competing choice.
- [ ] PNG activity summary and contribution calendar both match the selected period.
- [ ] Period text appears once in the PNG; Contribution Calendar does not duplicate it.
- [ ] Downloaded PNG matches the visible preview.
- [ ] Downloaded image is exactly 1080 × 1080.

### Embed

- [ ] Open **Share → Embed** with a calendar month selected.
- [ ] Repeat with a rolling period such as 60D.
- [ ] Generated embed preserves the selected period after loading in a test host page.
- [ ] Labels and values match the normal shared page.
- [ ] Auto-height behavior still works.

## 3. Website regression

### Profile loading and failures

- [ ] Valid username.
- [ ] Valid GitHub profile URL.
- [ ] Nonexistent user.
- [ ] Invalid input.
- [ ] GitHub API rate-limit state.
- [ ] GitHub/network failure state.
- [ ] Contribution-service failure leaves profile/repository data visible.
- [ ] Contribution-dependent values are marked unavailable instead of zero.

### Rolling activity periods

For **24H, 7D, 30D, 60D, 6M, 1Y, ALL TIME**:

- [ ] Contributions correct.
- [ ] Active days correct.
- [ ] Best day correct.
- [ ] Longest streak correct.
- [ ] Label correct.
- [ ] Contribution calendar uses the same rolling window.

### Profile/repository layout

- [ ] Public repo count correct.
- [ ] Forks remain excluded from ranked repository results.
- [ ] Loaded-repository star total behaves as documented.
- [ ] Followers/following correct.
- [ ] Account age correct.
- [ ] Long username does not break layout.
- [ ] Long display name does not break layout.
- [ ] Long bio does not break layout.
- [ ] Long repo name/description does not break layout.

### Navigation and responsive layout

- [ ] Back button.
- [ ] Browser Back/Forward.
- [ ] Direct `#/username` route.
- [ ] Refresh on a profile route.
- [ ] Desktop layout.
- [ ] Tablet layout.
- [ ] Small mobile layout.
- [ ] No unexpected horizontal scrolling.

---

## 4. Share-link regression

- [ ] Toggle Profile / Stats / Calendar / Repositories independently.
- [ ] 0, 1, 2, 3, and 4 selected repositories.
- [ ] Period choices: current month, historical month, calendar year, 30D, 60D, 6M, 1Y, All time.
- [ ] Text sizes: Compact, Balanced, Large, Huge.
- [ ] Accents: Auto/Profile, Blue, White, Cyan, Purple, Green.
- [ ] Card styles: Solid, Outline, Glass.
- [ ] Preview works.
- [ ] Copy link works.
- [ ] Shared page works on desktop and mobile.
- [ ] Zero-module configuration behaves intentionally.
- [ ] Zero-repository configuration does not repopulate defaults unexpectedly.

---

## 5. PNG regression

- [ ] PNG remains an independent Canvas 2D renderer (not a DOM screenshot).
- [ ] Preview is the exact canvas exported.
- [ ] Rounded corners look correct.
- [ ] Single top-right Gitbrag wordmark remains.
- [ ] Footer profile URL remains.
- [ ] Long names/repo names do not collide.
- [ ] No clipping or unexplained dead space.
- [ ] Module combinations: profile/stats/calendar/repos individually and together.
- [ ] Repository counts 0–4.
- [ ] Period choices: current month, historical month, calendar year, 30D, 60D, 6M, 1Y, All time.
- [ ] Every text size, accent, and card style.
- [ ] Avatar failure falls back to initials.
- [ ] Controls remain locked during export.
- [ ] Settings cannot supersede an in-progress export.

---

## 6. Chrome extension live-browser gate

These checks cannot be proven by static source inspection alone. Load the repository `extension/` directory unpacked in Chrome/Chromium.

### Placement and parity

- [ ] Overlay appears on a real public GitHub profile in the intended profile layout.
- [ ] Overlay does not appear on repositories, organizations, settings, search, or other reserved GitHub routes.
- [ ] Current calendar month is the default for a fresh/default install.
- [ ] The compact **‹ period ›** control matches the website interaction model closely enough to feel like the same product.
- [ ] Previous/next arrows step calendar months correctly and stop at current/earliest available month.
- [ ] Picker supports current month, previous month, current year, specific month/year, 24H, 7D, 30D, 60D, 6M, 1Y, and All Time.
- [ ] Contributions, active days, best day, and longest streak match the website for representative periods.
- [ ] Contribution heatmap follows the selected period and remains usable for month, year, rolling, and All Time selections.
- [ ] Profile summary shows Public repos, Stars, Followers, Following, and Account age.
- [ ] Stars match the website's loaded non-fork repository aggregation.
- [ ] Top three repositories exclude forks and are ranked by stars consistently with the website.
- [ ] **Open in Gitbrag** opens the correct full profile.

### GitHub integration

- [ ] GitHub dark mode looks intentional.
- [ ] GitHub light mode looks intentional.
- [ ] Narrow/sidebar layout remains readable with no horizontal page overflow.
- [ ] Wide/fallback main-column placement remains readable.
- [ ] Navigate between profiles using GitHub SPA/Turbo navigation; overlay updates to the new user.
- [ ] Re-injection works after GitHub rebuilds the profile DOM.
- [ ] No duplicate overlays appear after repeated navigation or DOM replacement.

### Popup, cache, and failures

- [ ] Popup enable/disable removes/restores the overlay.
- [ ] Default-period setting supports Current month, 24H, 7D, 30D, 60D, 6M, 1Y, and All Time.
- [ ] Changing default period refreshes the active overlay.
- [ ] Cache clear works.
- [ ] Retry/force refresh bypasses the current cached profile.
- [ ] Cached badge appears only for cached profile responses.
- [ ] Loading state is visible and stable.
- [ ] Contribution-service failure leaves profile/repository data visible and contribution output unavailable.
- [ ] GitHub API rate-limit/error state remains visible.
- [ ] Malformed/partial response handling remains visible rather than silently removing the overlay.
- [ ] Background-service communication failure remains visible and retryable.

---

## 7. Accessibility / browser behavior

- [ ] Keyboard navigation through main app.
- [ ] Share menu Arrow Up/Down and Home/End.
- [ ] Enter/Space activation.
- [ ] Escape closes transient UI.
- [ ] Dialog focus placement and return.
- [ ] Visible focus states.
- [ ] Period picker button exposes correct `aria-expanded` state.
- [ ] Previous/next month buttons expose disabled state correctly.
- [ ] Custom month/year controls have usable labels and focus behavior.
- [ ] Form controls have usable labels.
- [ ] Live/status messages make sense.
- [ ] Contrast acceptable.
- [ ] Reduced-motion behavior acceptable.
- [ ] Chrome/Chromium smoke test.
- [ ] Firefox smoke test.
- [ ] Safari smoke test if available.

---

## 8. Final 1.0 release gate

After every release-blocking item above passes:

- [ ] Freeze feature development.
- [ ] Change visible version to `v1.0.0`.
- [ ] Change all main-site cache-busting references to `?v=1.0.0`.
- [ ] Set extension manifest version to `1.0.0` if included in the release.
- [ ] Rewrite/freeze README as final-product documentation.
- [ ] Run all automated tests and syntax checks again.
- [ ] Perform one final deployed GitHub Pages smoke test.
- [ ] Confirm no console-breaking errors.
- [ ] Confirm deployed assets actually serve v1.0.0.
- [ ] Tag `v1.0.0`.
- [ ] Create the GitHub release and release notes.

When these pass, Gitbrag 1.0 is ready.
