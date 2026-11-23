# OtzyvTop — design system

Current state (after the 2026-11-23 correction):

- **Color scheme: the pre-redesign one, restored from v4. Do not change
  colors without an explicit user instruction.** Mint background,
  bright-green gradient hero with glow and dot grid, emerald buttons
  and active navigation, pastel category tiles, gradient monograms.
- **Icons: strict professional monochrome line icons**, uniform 1.5
  stroke, no fills, no toy-like drawn scenes, no emoji anywhere in
  the interface. Category icons: bag, bank, truck, cloche, leaf, car,
  house, graduation cap, monitor with code, compass. Actions use one
  unified line set (pen, thumbs, phone, globe, close cross, etc.).
- Typography: Onest/Manrope, tight tracking.
- Cards: soft shadows, hover lift; medals for top-3; animated rating bars;
  cascading content appearance; sliding modals; live star picker.
- Mobile: bottom tab bar; no overflow at 390px; `prefers-reduced-motion`
  and dark theme support.
- Company logos: Google favicon by domain (128px); monogram fallback
  with initials when no logo/website. Rare domains without their own
  favicon may show a generic globe — fix those `logoUrl` manually.

## What happened with the strict redesign

The 2026-11-23 strict redesign replaced the whole visual system
(solid dark hero, black search button, neutral tiles, uniform dark
monograms). The user rejected the color change: nobody asked to change
colors, only the icons needed finishing. The fix: v4 restored
(colors back), then an icons-only edit. Lesson recorded: never change
the color scheme without being asked.
