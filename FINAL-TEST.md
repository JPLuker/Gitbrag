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

## 2. Dated month/year activity periods (v0.9.7)

### Main dashboard

- [ ] **DATED** opens the calendar-period picker.
- [ ] The picker contains months from the GitHub account's creation month through the current month.
- [ ] The picker contains years from the GitHub account's creation year through the current year.
- [ ] Future months/years are not offered.
- [ ] Selecting a historical month such as **August 2026** uses exactly Aug 1–31.
- [ ] Selecting the current month shows **MONTH TO DATE** in the activity label.
- [ ] Selecting a historical year uses exactly Jan 1–Dec 31.
- [ ] Selecting the current year shows **YEAR TO DATE** in the activity label.
- [ ] Contributions are correct for a dated month.
- [ ] Active days are correct for a dated month.
- [ ] Best day is correct for a dated month.
- [ ] Longest streak is correct for a dated month.
- [ ] Contributions are correct for a dated year.
- [ ] Active days are correct for a dated year.
- [ ] Best day is correct for a dated year.
- [ ] Longest streak is correct for a dated year.
- [ ] Switching from DATED back to 24H/7D/1M/6M/1Y/ALL TIME clears the DATED active state.
- [ ] Returning to DATED remembers/reflects the active dated selection while that profile remains loaded.

### Share links

- [ ] Open **Share → Share link** while the main dashboard is on a dated month; the same dated month is selected.
- [ ] Open **Share → Share link** while the main dashboard is on a dated year; the same dated year is selected.
- [ ] The Stats period dropdown includes calendar-month and calendar-year choices.
- [ ] Previewing a dated share page shows the correct label and values.
- [ ] Copying and reopening a dated share link preserves the exact period.
- [ ] A v1 compact share token from pre-v0.9.7 still opens correctly.
- [ ] A legacy v1 JSON `?share=` token still opens correctly.
- [ ] Invalid/unsupported tokens fail safely and fall back to the full profile.

### PNG generator

- [ ] Open **Generate image** while the main dashboard is on a dated month; the first rendered preview uses that dated month (not rolling 1M).
- [ ] Open **Generate image** while the main dashboard is on a dated year; the first rendered preview uses that dated year.
- [ ] Dated periods appear in the PNG Stats period selector.
- [ ] Changing between rolling and dated periods re-renders the preview.
- [ ] PNG activity label matches the selected calendar month/year.
- [ ] Downloaded PNG matches the visible preview.
- [ ] Downloaded image is exactly 1080 × 1080.

### Embed

- [ ] Open **Share → Embed** with a dated month selected.
- [ ] Generated embed preserves the dated period after loading in a test host page.
- [ ] Dated labels and values match the normal shared page.
- [ ] Auto-height behavior still works.

---

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

For **24H, 7D, 1M, 6M, 1Y, ALL TIME**:

- [ ] Contributions correct.
- [ ] Active days correct.
- [ ] Best day correct.
- [ ] Longest streak correct.
- [ ] Label correct.

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
- [ ] Calendar ranges: 1M, 3M, 6M, 1Y, 2Y, All available.
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
- [ ] Calendar ranges 1M / 3M / 6M / 1Y / 2Y / all.
- [ ] Every text size, accent, and card style.
- [ ] Avatar failure falls back to initials.
- [ ] Controls remain locked during export.
- [ ] Settings cannot supersede an in-progress export.

---

## 6. Chrome extension live-browser gate

These checks cannot be proven by static source inspection alone.

- [ ] Load unpacked in Chrome/Chromium.
- [ ] Card appears on a real public GitHub profile in the intended location.
- [ ] GitHub dark mode.
- [ ] GitHub light mode.
- [ ] 7D / 1M / 6M / 1Y tabs.
- [ ] SPA/Turbo navigation between profiles.
- [ ] Re-injection after GitHub rebuilds the profile DOM.
- [ ] No duplicate cards.
- [ ] Popup enable/disable.
- [ ] Default-period setting.
- [ ] Cache clear.
- [ ] Retry/force refresh.
- [ ] Loading state.
- [ ] Contribution-service failure.
- [ ] GitHub API rate-limit/error state.
- [ ] Malformed/partial response handling.
- [ ] Background-service failure handling.
- [ ] Errors remain visible instead of silently removing the card.

---

## 7. Accessibility / browser behavior

- [ ] Keyboard navigation through main app.
- [ ] Share menu Arrow Up/Down and Home/End.
- [ ] Enter/Space activation.
- [ ] Escape closes transient UI.
- [ ] Dialog focus placement and return.
- [ ] Visible focus states.
- [ ] DATED button exposes correct `aria-pressed` / `aria-expanded` state.
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
