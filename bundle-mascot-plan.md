# Bundle — Mascot & Extension Plan

## Concept
Bundle is a Chrome extension: one click opens a user-configured "collection" of
tabs/searches (e.g. a design collection opens Pinterest + shadcn, a student
collection opens Claude + a YouTube search for a subject). Collections are
fully user-configurable (add/remove/create).

The extension popup features a reactive mascot (built on the Bloub generator,
github.com/jeremy-prt/bloub) — hexagon shape, color #AD2222 — that responds to
real extension states instead of sitting static. Goal: make it feel alive,
not like generic dead UI decoration.

---

## State → Animation Mapping

| Bundle Event/State                          | Animation           | Notes |
|----------------------------------------------|----------------------|-------|
| Popup open, nothing happening                 | Idle                 | default resting state; should include occasional blink/micro-movement so it never looks frozen |
| Hovering a collection button                   | Attentive / Wide eyes| "about to click" cue |
| Collection clicked, tabs opening               | Thinking / Notification (3 dots) | processing signal |
| All tabs opened successfully                    | Excited / Happy      | payoff / reward moment |
| User typing (naming collection, adding URL)     | Wink / Wide eyes, blinking | feels attentive while typing |
| Error (bad URL, empty collection submit)        | Confused / Alert (!) | clear but not alarming |
| No collections configured yet (empty state)     | Sleepy               | "wake me up by adding one" |
| Collection deleted                              | Sad (briefly) → Idle | small emotional beat |
| Hovering the toolbar icon (before popup opens)  | Curious              | personality even pre-click |

### Unmapped Bloub animations (no clear Bundle use yet)
Egg, Orbit, Comet, Burst — revisit once core states are wired up; could become
easter eggs (e.g. Burst/Comet on some rare/fun trigger) rather than core UX.

### Making it feel alive (beyond just having the poses)
- Idle should not be perfectly static — small periodic blink/shift loop.
- Snappy, slightly overshooting transition easing between states matters more
  than the poses themselves for "alive" feeling.
- Optional: subtle sound cue on Excited/success state — easy to overdo, so
  treat as a stretch goal, not core.

---

## Folder Structure (proposed)

```
bundle-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/                # "manage collections" screen, if separate from popup
│   ├── options.html
│   ├── options.css
│   └── options.js
├── background.js           # service worker, if needed
├── assets/
│   ├── icons/               # toolbar/extension icons (16/32/48/128px static PNGs)
│   └── mascot/
│       ├── animations/      # <-- put generated animation videos/lotties here
│       │   ├── idle.<ext>
│       │   ├── attentive.<ext>
│       │   ├── thinking.<ext>
│       │   ├── excited.<ext>
│       │   ├── typing-wink.<ext>
│       │   ├── error-alert.<ext>
│       │   ├── sleepy.<ext>
│       │   ├── sad.<ext>
│       │   └── curious.<ext>
│       └── static/          # fallback static frames per state, if needed
└── lib/                     # shared JS logic (state machine, tab-opening logic, etc.)
```

Put every generated animation clip in `assets/mascot/animations/`, one file
per state, named to match the state exactly (see clean list below) so the
state-machine code can map `stateName -> assets/mascot/animations/stateName.<ext>`
directly without a lookup table to maintain by hand.

Format note: if the animations are Lottie/JSON exports, `.json` works great
and is lightweight for an extension popup. If they're actual video (mp4/webm)
or GIF, keep them short-looped and small — popup real estate and load time
matter a lot here.

---

## Clean List of Animations Needed (generate these)

1. `idle` — resting state, subtle periodic blink/micro-movement, loopable
2. `attentive` — hover/about-to-interact cue
3. `thinking` — processing/loading (tabs opening)
4. `excited` — success/payoff (all tabs opened)
5. `typing-wink` — active while user is typing, blinking loop
6. `error-alert` — error state (bad URL / empty collection)
7. `sleepy` — empty state (no collections configured)
8. `sad` — brief transitional beat on delete, before returning to idle
9. `curious` — toolbar icon hover, pre-popup-open

That's 9 core animations to generate. Keep each one a clean loop (except
`sad`, which can be a short one-shot transition back into idle).

---

## Next Steps
- [ ] Scaffold manifest.json + popup shell
- [ ] Build state machine tying real extension events to the 9 states above
- [ ] Wire up mascot component to swap animation based on current state
- [ ] Generate the 9 animations (user-driven, via Bloub or similar)
- [ ] Drop each into `assets/mascot/animations/` named per the list above
