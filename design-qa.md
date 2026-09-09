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

## 2026-09-09 — Main platform landing (latest)

### Target and evidence

- Source: `/var/folders/pd/ytsw9j8s3pv23k7p5tmngl6m0000gn/T/codex-clipboard-26ab3e6a-6b41-46c8-90cd-2fe953ed052f.png` (3360 × 12030 raster). User requested a coaching-service adaptation, not a pixel-for-pixel portfolio clone.
- Implementation: `http://localhost:3011/`, authenticated navigation state. Anonymous label follows the existing login check; no auth changes.
- Desktop captures: `/tmp/clyr-landing-qa/desktop-full.png` (despite filename, a capped 1440 × 1365 top capture, not the entire page), `numbers.png`, `features.png`, `brands-fixed.png`, `pricing.png`, `contact.png` in the same directory (1440 × 1100 section captures).
- Mobile: `/tmp/clyr-landing-qa/mobile.png` (390 × 844) and `contact-mobile.png` (320 × 740). Widths 320, 390, 768, 1024, 1440 checked against document scroll width; no horizontal overflow.
- Source density/CSS viewport is unspecified. Compare proportional layout at normalized display width, not absolute source pixels. Full composition is covered by section captures, not falsely claimed as one full-page raster. Source plus implementation captures were opened together for comparison; detailed desktop and mobile states were inspected separately at readable scale.

### Findings and comparison history

1. P2: Mobile Korean headline orphaned the final syllable. Applied word-break: keep-all and overflow-wrap fallback. Recaptured mobile.png: complete word grouping, no horizontal overflow.
2. P2: Shared form CSS overrode textarea minimum height to 48px. Set a scoped 128px textarea minimum. contact.png confirms a proper multiline field.
3. P2: Transparent black brand assets disappeared on dark cards. Added a white padded asset surface. brands-fixed.png confirms both supplied logos are readable and retain their aspect ratios.
4. Final comparison: no remaining actionable P0/P1/P2 findings in the inspected landing states.

### Required fidelity surfaces

- Typography: existing Pretendard plus mono section labels; bold left-aligned hero, readable Korean line grouping, lighter supporting copy. Larger readable mobile type intentionally replaces the source's dense portfolio microcopy.
- Spacing/layout: restrained central 1120px wrapper, wide vertical rhythm, left headings, right-aligned metric values with thin blue rules, split feature/contact regions. Mobile stacks cards and contact fields. Source's portfolio project grid is intentionally adapted to two existing coaching brands plus the existing four commercial plans.
- Colors: near-black surfaces, off-white titles, muted gray supporting copy, blue CTA and divider accents. Source's decorative blue glow is omitted rather than replaced by fake image assets.
- Images: existing local XON/AMOR assets only, no fabricated customer screenshots, testimonials, or generated brand imagery. Portfolio-specific images are not relevant to the coaching product adaptation.
- Copy/content: coaching-specific benefits; metrics are dated, defined static DB aggregates, not MAU or revenue. See docs/landing-metrics.md for query and exclusions. Existing prices/contact channels retained.

### Functional verification and limits

- Hero CTA and section navigation work. FAQ expand confirmed. Required contact fields accept input; preparing the inquiry exposes an encoded mailto draft and explicitly states it has not been sent. No email was sent and no contact data is stored server-side.
- Browser console error/warn snapshot: empty. TypeScript and changed-file ESLint pass; full lint has 0 errors / 711 pre-existing warnings; production build passes. Subsequent final edits are CSS/asset-surface-only and also pass type/lint checks.
- Real mobile hardware, email client delivery, external App Store availability, and anonymous authenticated redirect behavior were not exhaustively exercised. Existing external links were retained.
- No schema/RLS changes, migrations, secrets, per-user data publication, deployment, commit, or push.

### Follow-up polish

- P3: Approved real product screenshots could enrich brand cards later; current supplied logos are intentional and not fake product previews.

final result: passed
