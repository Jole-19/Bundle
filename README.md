# Bundle

A Chrome extension that opens a user-configured "collection" of tabs and searches with one click — powered by a reactive Bloub mascot.

## Features

- **Collections** — Create bundles of URLs and search queries. One click opens them all.
- **Reactive Mascot** — A hexagonal blob (built on [Bloub](https://github.com/jeremy-prt/bloub)) that responds to real extension states: idle, attentive, thinking, excited, typing, error, sleepy, sad, and curious.
- **Dark UI** — Premium dark theme with smooth transitions and micro-animations.

## Install

1. Clone this repo
2. Go to `chrome://extensions` → Enable **Developer mode**
3. Click **Load unpacked** → select the `bundle-extension/` folder

## Mascot States

| State | Trigger |
|-------|---------|
| Idle | Default resting state |
| Attentive | Hovering a collection |
| Thinking | Tabs opening |
| Excited | All tabs opened successfully |
| Typing-wink | User typing in form |
| Error-alert | Bad URL or empty submit |
| Sleepy | No collections configured |
| Sad | Collection deleted |
| Curious | Reserved |

## Credits

Mascot animations generated with [Bloub](https://github.com/jeremy-prt/bloub) by jeremy-prt.
