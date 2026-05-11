# DESIGN.md Spec Review (Phase 0 → Phase 1 gate)

Reviewer: Claude (design-review skill, adapted for spec audit)
Date: 2026-05-10
Target: rewritten `DESIGN.md` (app-ui-v0)
Decisions reference: `PHASE-0-DESIGN-DECISIONS.md` (A1 Calm Blue `#2563EB`, B1 Fresh Finance Palette)
Companion data: `PHASE-3-DATA-INVENTORY.md` Appendix A (Plaid suggested-category risk resolved)

---

## First impression

The rewrite lands the **direction** cleanly. Inter-only, ink-first, blue action accent, fixed 12-hue category palette, no editorial display sizes, no atmospheric components. The "Removed From The Legacy Spec" section is explicit anti-pattern protection — that's the right move.

It does **not** land the **completeness** target. Several tokens are dead (defined, never referenced). A few component specs Phase 1 will hit are missing or under-specified. Three deviations from `PLAN.md` Phase 0 spec are silent — likely harmless, but should be reviewed.

**Verdict: revise then proceed to Phase 1.** None of the gaps are fatal. All fixes are surgical. The agent that wrote this spec did 85% of the work; the remaining 15% is what Phase 1 would otherwise have to invent.

---

## Conformance check vs PLAN.md Section 3 (Phase 0 spec)

### Tokens to keep (translate) — PLAN required vs DESIGN.md delivers

| PLAN.md required | DESIGN.md actual | Match |
|---|---|:---:|
| Ink `#292524` | `ink: #292524` | ✅ |
| Off-white canvas `#f5f5f5` | `canvas: #f8f7f4` | ⚠️ DEVIATION |
| Body `#4e4e4e` | `body: #4e4e4e` | ✅ |
| Muted `#777169` | `muted: #777169` | ✅ |
| Hairline `#e7e5e4` | `hairline: #e7e5e4` | ✅ |
| Pill button geometry | `button-primary rounded: pill` | ✅ |
| 8px-base spacing `4 / 8 / 12 / 16 / 20 / 24 / 32 / 48` | `2 / 4 / 8 / 12 / 16 / 20 / 24 / 32` | ⚠️ DEVIATION |

**Deviation 1 — Canvas color shift `#f5f5f5` → `#f8f7f4`.** Not flagged in `PHASE-0-DESIGN-DECISIONS.md`. The new canvas is slightly warmer (R=248 G=247 B=244 vs uniform 245). Likely intentional for a softer feel, but should have been recorded. Implication: contrast claims in `PHASE-0-DESIGN-DECISIONS.md` were computed against `#f5f5f5`, not `#f8f7f4` — the actual numbers shift slightly (see WCAG section below).

**Deviation 2 — Spacing scale.** `48px` (PLAN's `xxl`) is missing. `2px` (`xxxs`) is added. `xxxs` is unreferenced anywhere in the spec (dead token).

### Tokens to remove — PLAN required vs DESIGN.md delivers

| PLAN required to remove | DESIGN.md handling | Match |
|---|---|:---:|
| Waldenburg tokens | Not present; explicitly banned in "Removed From The Legacy Spec" | ✅ |
| `display-mega 64`, `display-xl 48`, etc. | Not present | ✅ |
| Weight 300 as display signature | Not present | ✅ |
| Gradient orb tokens | Not present | ✅ |
| `hero-band`, `cta-band`, etc. | Not present | ✅ |
| 96px section padding | Replaced with `page: 32px` | ✅ |
| Editorial Overview prose | Replaced with app-UI principles | ✅ |

### Tokens to add — PLAN required vs DESIGN.md delivers

| PLAN required to add | DESIGN.md actual | Match |
|---|---|:---:|
| Typography scale Inter 400/500/600 | All Inter, weights 400/500/600 only | ✅ |
| `tabular-figure` modifier | Defined with `fontVariantNumeric` + `fontFeatureSettings` | ✅ |
| `category-*` × 10–12 hues | 12 hues, named, with solid + tint variants | ✅ |
| `accent-action` (blue per OD1) | `accent-action: #2563EB` per A1 | ✅ |
| `status-success / warning / error` separate namespace | `semantic-success / warning / error` (renamed but separate from category) | ✅ (name differs from PLAN) |
| `surface-canvas / card / hover / selected` | `canvas`, `surface`, `surface-hover`, `surface-selected` present | ✅ |
| Dark-mode token slots reserved | `dark-mode-reserved` block present | ✅ |
| `table-row` (comfortable / compact) | `heightComfortable: 44px`, `heightCompact: 36px` | ✅ |
| `table-cell-label` / `table-cell-amount` | Both present | ✅ |
| `category-pill` | Present (uses `{category.tint}` placeholder) | ⚠️ see F2 |
| `progress-bar` (track + fill in category color) | Present | ✅ |
| `status-dot` (paired with label rule) | Present | ✅ |
| `sheet / drawer` | `sheet` present | ⚠️ no width spec — see F8 |
| `toolbar` | Present | ✅ |
| `row-hover / row-selected` states | Folded into `table-row` + `sidebar-item` | ✅ (acceptable) |
| `filter-chip / badge-numeric / nav-row` | Only `filter-chip` present | ❌ see F9, F10 |

---

## OD1 / OD2 conformance

**OD1 (A1 Calm Blue `#2563EB`):** ✅ Encoded as `accent-action`, with hover (`#1D4ED8`), pressed (`#1E40AF`), muted (`#DBEAFE`), and `on-accent-action: white` variants. Phase 1 ready.

**OD2 (group-level category color, stored on record, deterministic fallback):** ✅ The B1 palette is encoded as 12 `category-*` + `category-*-tint` pairs. The "group-level inheritance" rule is documented in prose ("Child categories inherit their group color unless a later explicit color-setting feature is built"). The "deterministic fallback" rule is documented ("Unknown custom category groups map to this palette by stable hash of the group name"). **Storage on category record — documented as a future feature, not in v0 tokens.** That's acceptable; the data-model change comes with Phase 3 categories work, not Phase 0.

---

## WCAG spot-check

I recomputed two claims from `PHASE-0-DESIGN-DECISIONS.md` against the actual new canvas color (`#f8f7f4`, not the legacy `#f5f5f5` the doc appears to have used).

| Claim | Documented | Computed on actual canvas | Status |
|---|---:|---:|---|
| A1 `#2563EB` vs white | 5.17:1 | 5.17:1 | ✅ |
| A1 `#2563EB` vs canvas (`#f8f7f4`) | 4.74:1 | 4.83:1 | ✅ (slightly better than claimed) |
| `category-housing` `#B45309` vs canvas (`#f8f7f4`) | 4.61:1 | 4.71:1 | ✅ (slightly better than claimed) |
| `category-housing` `#B45309` vs legacy canvas (`#f5f5f5`) | 4.61:1 | 4.63:1 | ✅ (claim was computed against legacy canvas) |

**Conclusion:** all contrast claims pass WCAG AA. The recorded numbers are slightly conservative because they were computed against the **legacy** canvas (`#f5f5f5`), not the new one (`#f8f7f4`). The error is in the user's favor — actual contrast is better than documented. Worth updating the contrast table in `PHASE-0-DESIGN-DECISIONS.md` for cleanliness, but not a blocker.

---

## Findings, ranked by severity

### HIGH — fix before Phase 1 starts

**F1 — `{category.tint}` / `{category.solid}` placeholder resolution is undocumented.**
`category-pill backgroundColor: "{category.tint}"`, `category-dot backgroundColor: "{category.solid}"`, `progress-bar fillColor: "{category.solid}"` all use a templating placeholder. The implementer needs to know: how does an instance of `category-pill` for a "Food & Drink" group resolve `{category.tint}` to `category-food-tint`? Is there a runtime function (`getCategoryToken(group, 'tint')`), a TypeScript type union, a CSS custom-property convention?

**Fix:** add a one-paragraph "Token resolution" section to DESIGN.md explaining the binding. Suggested rule: `{category.X}` resolves to `category-{group}-X` via a typed helper in the new typography/color module, with the deterministic hash fallback applied when `group` is custom.

**F2 — No focus-ring spec.**
`button-primary`, `button-secondary`, `input`, `select`, `filter-chip` all define hover/active/border but **none specify focus-visible**. Accessibility blocker for keyboard users. Phase 1 implementer will invent.

**Fix:** add a `focus-ring` token (suggested: 2px solid `accent-action` with 2px offset, or `box-shadow: 0 0 0 3px accent-action-muted`). Reference it from every interactive component spec.

**F3 — `display-2xl` is unreferenced.**
Defined as 32px / 600 / 1.15 (intended for "Page hero/title on dashboard-like surfaces" per `PHASE-0-DESIGN-DECISIONS.md`), but no component spec in DESIGN.md uses it. Phase 1 implementer won't know whether to apply it to the Dashboard greeting, the Reports page title, both, or neither.

**Fix:** either add to a `page-header` component spec, or document its usage in the prose section under "Component-Specific Notes."

**F4 — `table-cell-amount` doesn't specify negative-value rendering.**
Section only says `textAlign: right` + `numeric: tabular-figure`. The legacy app uses `-$123.45`; Copilot uses `($123.45)`. Without a rule, Phase 1 will guess and inconsistencies will appear across surfaces.

**Fix:** add explicit rule. Recommend: `-$X.XX` with the minus sign in `semantic-error` color (only when negative), value itself in ink. Or document the existing convention.

### MEDIUM — fix soon; rework cost rises later

**F5 — Canvas color silently shifted `#f5f5f5` → `#f8f7f4`.**
Not in `PHASE-0-DESIGN-DECISIONS.md`. Likely intentional (warmer feel), but undocumented design changes are a smell. Implication: the contrast tables in `PHASE-0-DESIGN-DECISIONS.md` are computed against the wrong canvas (results all become more accessible, so no a11y break).

**Fix:** add a line to `PHASE-0-DESIGN-DECISIONS.md`: "Canvas color shifted from legacy `#f5f5f5` to `#f8f7f4` for a warmer base. All contrast tables in this doc reflect the legacy canvas; new contrasts are equal or higher."

**F6 — Spacing scale loses 48px, gains unused 2px.**
PLAN.md spec specified `4 / 8 / 12 / 16 / 20 / 24 / 32 / 48`. New DESIGN.md has `2 / 4 / 8 / 12 / 16 / 20 / 24 / 32`. The 48px slot is sometimes needed (section gaps within dense surfaces — e.g., between a card group and the next group). The 2px slot is currently dead (unused in any component).

**Fix:** restore 48px (`xxxxl` or `section`); drop 2px unless a use is documented; or document where 2px is intended (e.g., icon padding micro-adjustment).

**F7 — No empty-state, loading, error component specs.**
Phase 4 mentions them, but DESIGN.md doesn't define their tokens. Phase 1 doesn't strictly need them, but Phase 2 (demolition + hide setup) will hit empty states immediately (e.g., bank-sync with no Plaid accounts yet).

**Fix:** add minimal specs: `empty-state` (centered, title in `display-lg`, body in `body-md`, illustration optional, action button below), `loading-skeleton` (rounded rect with `surface-subtle` background, no animation in v0).

**F8 — `sheet` component has no width.**
PLAN.md called for a "right-side detail sheet pattern" for editing. The spec defines `backgroundColor`, `border`, `rounded`, `shadow`, `padding` — but no `width` or positioning. Phase 3 transactions/categories will use this immediately.

**Fix:** add `width: 420px` (or specify range: `min: 360px`, `max: 480px`).

**F9 — `badge-numeric` missing.**
PLAN.md called for it; DESIGN.md doesn't have it. Phase 1 doesn't need it yet, but Phase 3 (Transactions to Review count, unreviewed indicator, sidebar account-count badges) will.

**Fix:** add a `badge-numeric` component: small pill, `caption` typography, background `accent-action` or `semantic-error` for attention badges.

**F10 — `nav-row` / top-nav distinction missing.**
`sidebar-item` covers left-nav. The toolbar is height + border + bg only — no spec for the items within it (Dashboard / Reports / Schedules / etc., the horizontal nav row). Phase 2 demotes Reports under "More" — that work touches top-nav.

**Fix:** add `nav-row` (height, padding, typography, active state) and `nav-item` (analogous to `sidebar-item` but horizontal).

**F11 — Mobile-specific tokens missing (touch-target sizes).**
PLAN.md Section 13 said shared component tokens apply to both desktop and mobile, but mobile needs touch-target size specs. DESIGN.md has `button-primary height: 40px` (the WCAG-AA minimum is 44px). On mobile, the button might need to grow.

**Fix:** add a mobile-overrides block, or document that `density-comfortable.rowHeight: 44px` is the mobile-safe default.

### LOW — clean up before Phase 1 closes

**F12 — `ink-strong` defined but unreferenced.** Either use it (in `display-2xl`?) or delete.

**F13 — `surface-raised` is identical to `surface` (`#ffffff`).** Either differentiate (suggested: `surface-raised` adds a subtle shadow when card is elevated) or delete.

**F14 — `density-comfortable` and `density-compact` defined but not referenced from `table-row`.** `table-row` defines its own `heightComfortable` and `heightCompact` inline. Either the density tokens should be referenced from `table-row`, or the density-tokens block is redundant.

**F15 — `semantic-info` (`#0369A1`) is identical to `category-travel` solid.** Not strictly wrong (they're in different namespaces — semantic vs category), but a small reuse risk if they appear next to each other in the UI.

**F16 — Token reference syntax inconsistent.** Some tokens use `"{typography.family.app}"`, others use `"{colors.ink}"` (with dot path), others use `"{rounded.pill}"`. The dot-vs-flat mixing isn't a bug, but the resolution rules should be documented for consistency.

---

## Coverage gaps

The 5 visible-surface inventory from PLAN.md Section 4 — does DESIGN.md cover every component each surface needs?

| Surface | Components needed | DESIGN.md covers? |
|---|---|:---:|
| `/budget` budget table | page-shell, sidebar, toolbar, table-header, table-row, table-cell-label, table-cell-amount, category-pill, progress-bar, button-primary | ✅ (modulo F1) |
| `/reports` widget grid | page-shell, metric-card, chart-label, chart-value, chart-axis | ✅ |
| `/accounts/*` account + transaction list | sidebar, toolbar, table-row, table-cell-amount, category-pill, status-dot, filter-chip | ✅ |
| `/schedules` schedule list | sidebar, toolbar, table-row, table-cell-amount | ✅ |
| `/bank-sync` provider UI | page-shell, card, button-primary, empty-state, badge-numeric | ❌ missing empty-state (F7) and badge-numeric (F9) |
| Right-side detail sheet (Phase 3) | sheet | ⚠️ no width (F8) |
| Top nav (Phase 2 Reports demotion) | nav-row + nav-item | ❌ missing (F10) |

---

## Design-score baseline (deferred)

The PLAN Section 13 implementer protocol asked for a `/design-review` baseline on the **live app** before Phase 1 starts. I attempted to capture this, but the preview viewport rendered at portrait dimensions — not suitable for a meaningful baseline. **Recommend:** capture the baseline manually via a proper viewport on a later pass (or accept the previous live-app screenshots from the earlier design-review session as the baseline; first-impression critique, Reports cards typography table, AI Slop assessment were all logged at that time).

Phase 4's target should be: **dashboard surface design score improves by at least one letter grade vs the captured baseline.**

---

## Summary

**Phase 0 deliverable status:**

- ✅ Direction landed: app-UI tokens, no editorial display, no atmospheric components
- ✅ OD1 + OD2 decisions correctly encoded
- ✅ WCAG AA contrast confirmed on spot-checks (better than documented)
- ✅ "Removed From Legacy Spec" anti-pattern guard is excellent
- ⚠️ 3 silent deviations from PLAN.md spec (canvas color, spacing scale)
- ⚠️ 4 dead tokens (`display-2xl`, `ink-strong`, `xxxs`, `surface-raised`)
- ⚠️ Missing component specs: focus-ring, empty-state, sheet width, badge-numeric, nav-row, mobile touch-target overrides
- ⚠️ Token-resolution syntax for category placeholders undocumented

**Recommendation: HOLD Phase 1 start until HIGH findings (F1–F4) are addressed.** MEDIUM findings (F5–F11) can land in a second pass after Phase 1's first component is wired, when the implementer hits real friction. LOW findings (F12–F16) are cleanup; not blocking.

The agent that wrote this DESIGN.md did a strong job on the foundation. The remaining work is well-defined and surgical. Phase 0 is **~90% complete**; one more iteration closes it.

---

## Suggested next action

1. **Codex (or another agent) addresses F1–F4** in a follow-up commit to DESIGN.md (~30 min work).
2. **Update `PHASE-0-DESIGN-DECISIONS.md`** to record the canvas color shift (F5).
3. **Capture live-app baseline screenshots** at proper viewport (1440×900) — track Phase 4 improvement target against this.
4. **Phase 1 unblocked** once F1–F4 land.
