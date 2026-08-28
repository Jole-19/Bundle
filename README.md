<div align="center">

  <img src="assets/icons/bundle-logo.svg" alt="Bundle Mascot Logo" width="120" height="120" />

  # Bundle

  **One click opens your whole workflow.**

  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-F6C667?style=flat-square&logo=googlechrome&logoColor=111111)](https://developer.chrome.com/docs/extensions/mv3/intro/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-8E1616?style=flat-square)](LICENSE)
  [![Open Source](https://img.shields.io/badge/Open_Source-%E2%9D%A4%EF%B8%8F-FEF5D9?style=flat-square&logoColor=111111)](#contributing)

</div>

---

##  What is Bundle?

**Bundle** is a sleek, executive Chrome extension designed to streamline your daily tabs and search routines into single-click workflows. 

Instead of manually opening 5 different bookmarks, documentation links, and search queries every time you switch contexts, **Bundle** lets you curate custom collections. Whether you're a designer opening Pinterest, Dribbble, and component specs, or a student opening Claude, Odin Project, and subject searches—one click opens them all instantly.

Everything is fully user-configurable, wrapped in an executive dark theme with light-yellow container tints, and driven by a **reactive, animated mascot** that responds in real-time to your actions.

---

##  Key Features

- ** One-Click Collection Launching**: Instantly launch dozens of tabs and web searches in a single click.
- ** Smart Search Query Fallbacks**: Type plain search terms (e.g. `shadcn ui components` or `quantum physics tutorial`) alongside standard URLs, and Bundle automatically converts them into Google searches.
- ** Reactive Mascot Engine**: Powered by 9 dynamic SVG mascot states (`idle`, `attentive`, `thinking`, `excited`, `curious`, `sad`, `sleepy`, `error-alert`, `typing-wink`) that react to hovers, tab launches, form inputs, and errors.
- ** Retro CRT Intro Splash**: Enjoy a snappy CRT TV power-off boot animation upon launching the extension.
- ** Full Vertical Stretch Tab Picker**: Effortlessly capture open browser tabs into any collection, complete with custom monogram/protocol badges for sites missing native favicons.
- ** Interactive Delete Confirmation Modal**: Custom executive confirmation card featuring an expressive sad mascot reaction to prevent accidental deletion.
- ** Automatic Form Draft Recovery**: Never lose unsaved work—form progress is automatically preserved across popups.

---

##  Screenshots & Demo

> *Add your application screenshots or demo GIFs to the `assets/demo/` folder and update the paths below:*

<div align="center">

| Main Collection Dashboard | Tab Picker Modal |
| :---: | :---: |
| ![Main Dashboard Placeholder](assets/icons/icon-128.png) | ![Tab Picker Placeholder](assets/icons/icon-128.png) |

| Delete Confirmation Modal | Intro Splash Sequence |
| :---: | :---: |
| ![Delete Modal Placeholder](assets/icons/icon-128.png) | ![Intro Splash Placeholder](assets/icons/icon-128.png) |

</div>

---

##  Installation (Load Unpacked)

Until **Bundle** is published to the Chrome Web Store, you can easily run it locally in Developer Mode:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Jole-19/Bundle.git
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the cloned `Bundle` project directory.
6. Pin **Bundle** to your extension toolbar and enjoy your streamlined workflow!

---

##  Tech Stack

- **Extension Framework**: Chrome Extension Manifest V3 (Service Worker `background.js` + `chrome.storage.local`)
- **Frontend Logic**: Vanilla JavaScript (ES6+ modular state machine & DOM controller)
- **Styling**: Vanilla CSS3 (Custom Executive Tokens `#111111`, `#8E1616`, `#F6C667`, `#FEF5D9` & Keyframe Animations)
- **Graphics & Icons**: Inline SVG Sprite Sheet & Vector Animations

---

##  Contributing

Contributions, bug reports, and feature suggestions are warmly welcomed! Since **Bundle** is an open-source indie project:

1. Fork the project repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request!

---

##  License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 🙌 Credits

Special thanks to [Bloub](https://github.com/jeremy-prt/bloub) by **jeremy-prt** for serving as the visual base for our reactive mascot animations!
