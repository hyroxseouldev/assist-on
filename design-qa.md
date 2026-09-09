# Admin dashboard redesign — previous QA

Source visual truth: /Users/sunmkim/.codex/generated_images/01a07adc-8931-74c2-a3ad-efac2bdd7f5b/exec-5cbf22e2-aded-4b2b-95ce-02c1ccd58439.png (second displayed concept).

Implementation: http://localhost:3011/admin, on develop.

Previous dashboard result: blocked (historical; outside this pass).

The local in-app browser redirects to /login. A local authenticated owner/coach session is required before capturing the dashboard; production browser credentials were not transferred. No authenticated dashboard screenshot or side-by-side comparison has been captured.

Implementation preserves real queries and existing authorization, combines participation and coach reply metrics by program ID, uses the existing brand/sidebar and adds the selected two-column workspace. Mock dates, example content and invented chart numbers are not copied. Program periods are omitted because the existing dashboard data contract does not include them. Mobile stacks the action queue first.

Verified: TypeScript and production build pass; changed-file lint passes. Full lint has 711 pre-existing warnings, zero errors.

Pending visual checks after login:
- Capture desktop at the reference aspect ratio and compare source and implementation together.
- Check typography, spacing, tokens, existing avatar/logo rendering, and actual content wrapping.
- Check mobile layout, horizontal table scrolling, keyboard focus and empty states.
- Exercise feedback and membership navigation; check console output.

Viewport, implementation pixel dimensions, density normalization and focused comparisons: pending authenticated capture. No visual pass is claimed.

---

# Workout input and program feedback — 2026-09-09

Scope: selected two-page redesign on develop, shared components used by both /admin and /t/[tenantSlug]/admin. Existing dashboard edits were preserved.

## Evidence

- Workout source: /Users/sunmkim/.codex/generated_images/01a07adc-8931-74c2-a3ad-efac2bdd7f5b/exec-4db0e1f2-1b1d-47ed-ad84-0c10ba0ceea0.png
- Feedback source: /Users/sunmkim/.codex/generated_images/01a07adc-8931-74c2-a3ad-efac2bdd7f5b/exec-d743111d-29cd-421e-9088-4c41184a3263.png
- Workout desktop: /tmp/assist-on-design-qa-PXaGGb/sessions-desktop.png
- Workout mobile: /tmp/assist-on-design-qa-PXaGGb/sessions-mobile.png
- Feedback first saved comparison: /tmp/assist-on-design-qa-PXaGGb/feedback-desktop.png
- Feedback final comparison: /tmp/assist-on-design-qa-PXaGGb/feedback-desktop-final.png
- Feedback mobile: /tmp/assist-on-design-qa-PXaGGb/feedback-mobile.png

Screenshots remain in a local temporary directory, not committed, because authenticated screens contain member data.

Sources: 1487 x 1058 raster pixels. Desktop captures: 1440 x 1024 pixels/CSS viewport, 1x density. Mobile: 390 x 844 pixels/CSS viewport, 1x density. Source and implementation have effectively equal aspect ratios; compare proportional layout at 0.9684 source scale rather than treating the 47px source-width difference as layout drift. Full source and implementation images were emitted together in each final comparison input. Review focused on calendar cells, selection, review rows and the composer at full resolution; these controls were readable in the full captures, so separate crops were not necessary.

State: authenticated administrator, September 2026. Workout capture selects an existing September 7 session (source uses a fictional September 9 session); feedback selects a real September 9 unanswered review. Calendar density, names, note lengths and numeric counts intentionally reflect real records, not mock data. No exact content/pixel identity is claimed.

## Findings and comparison history

1. Initial feedback inspection: [P2] tall week header and duplicated inbox summary pushed the list down; session/profile accordions pushed the composer below the first viewport. Compacted header/summary, moved optional details after the composer in DOM order, reduced redundant spacing.
2. First combined comparison: [P2] save control and textarea competed with long real notes below the viewport. Made desktop detail scroll independently with a persistent footer submit button, then tightened header and metadata spacing. Existing optional details remain reachable by scrolling.
3. Final combined feedback comparison: member note, reaction choices, textarea, counter and submit button are visible for the selected short review. Long reviews scroll within the detail panel; footer remains available. No remaining actionable P0/P1/P2 layout findings.
4. Final combined workout comparison: calendar and selected session preview preserve the selected composition. Mobile stacks the preview below the calendar; 7 date columns fit without horizontal overflow. Existing create drawer and edit sheet remain in use.

## Required fidelity surfaces

- Typography: existing Korean font and admin type scale retained; 24px page titles, differentiated metadata and readable body text. Long program titles truncate in picker/list, while detail content wraps. Deliberately uses the product type system rather than imitating generated raster lettering.
- Spacing/layout: white bordered panels, wide calendar/detail and inbox/reader tracks, restrained 12px radii, consistent padding. Additional real controls consume space absent from the mock; they are compacted rather than removed.
- Colors/tokens: white/zinc surfaces, emerald selections and primary actions, existing semantic status/age labels retained. Existing global sidebar is unchanged, including its neutral selected state.
- Assets: supplied product logo, existing Avatar image/fallback components and Lucide icons retained. No new raster assets or decorative substitutes were needed.
- Copy/content: real program titles, sessions, reviews and counts. Feedback retains 300 characters (not the mock's invented 1000), reactions, reviewer metadata, workout metrics and HYROX info. No invented duration/intensity fields. Delete remains inside the existing edit flow; no new standalone completion-without-feedback action.

## Verification

- Browser checked: existing date selection and rendered workout body; empty date state; desktop edit form; scheduled publication fields and cohort guidance; editor toolbar/image action presence; mobile create drawer; feedback pending/today/reviewed tabs; selected member detail; reaction toggle; 301-character input limited to 300; mobile full-screen review and fixed save control; no captured console error/warning entries from the in-app browser logs.
- Draft-discard guards added for member, tab, date and week changes; cancellation dialog behavior needs manual confirmation because the automation click timed out around the native confirmation and no dialog remained to inspect.
- Program-keyed manager reset avoids carrying an old program's form state across program changes. Program switching itself and tenant-prefixed routes were inspected in code, not exhaustively browser-tested.
- pnpm exec tsc --noEmit passed; changed component lint passed; final pnpm build passed; final pnpm lint passed with 711 existing warnings and zero errors; git diff --check passed.
- No backend actions/queries, auth rules, migrations or dependencies changed. Form field names and submit handlers retained. No production create/update/delete/upload or feedback submission was performed. Persistence, successful/error server responses and upload completion are explicitly untested in this read-only live-data check.

## Follow-up

Use a designated test program/member before end-to-end persistence testing. No deployment, commit or push performed. Preview remains running at http://localhost:3011/admin/sessions and /admin/session-reviews.

final result: passed

This result is for the visual/layout gate and non-mutating interaction checks, not certification of untested backend writes.
