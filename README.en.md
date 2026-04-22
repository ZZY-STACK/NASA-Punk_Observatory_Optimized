# NASA-Punk: Observatory_Optimized

> ZZY-STACK version built on flowersauce/NASA-Punk_Observatory

[中文 README](README.md)

![Offline Ready](https://img.shields.io/badge/Offline-Ready-success?style=flat-square&logo=rss)
![WebGL](https://img.shields.io/badge/Render-WebGL-blueviolet?style=flat-square&logo=webgl)
![Three.js](https://img.shields.io/badge/Core-Three.js-black?style=flat-square&logo=three.js)
![Procedural](https://img.shields.io/badge/Assets-Procedural_Generation-orange?style=flat-square&logo=codio)
![Textureless](https://img.shields.io/badge/Resources-Textureless-lightgrey?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

## Overview

This project is a customized version of `NASA-Punk: Observatory`, rebuilt and extended by `ZZY-STACK` from the open
source base `flowersauce/NASA-Punk_Observatory`.

The original NASA-Punk visual framework remains the foundation, while this version focuses on data-driven particle
visualization, especially using Chinese aerospace data to drive each planet's particle system and visual behavior.

## Key Improvements

- Data-driven visualization: each planet uses Chinese aerospace data mapping to particle count and scene behavior.
- High-fidelity Earth rendering: Earth particle density is upgraded to the million-particle level for more detailed and
  refined surface appearance.
- Enhanced planet profiles: improved planet contours, rings, halos, and orbital details for a more polished celestial
  presentation.
- Deferred initialization and asynchronous generation: scene elements are loaded progressively to avoid blocking the
  initial render and improve viewing experience.
- Transition stability: page transitions were optimized to eliminate flash and keep the navigation animation smooth.
- Modern NASA-inspired color palette: adjusted transition and UI colors for a more cohesive aerospace theme.

## Features

- Static web app built with `HTML + CSS + JavaScript`.
- WebGL rendering powered by `Three.js`.
- Procedural visuals generated with `simplex-noise`, particle systems, and point clouds.
- Supports both a home page entry and direct planet page access.
- Suitable for local preview, GitHub Pages deployment, or wallpaper-style display.

## How to Run

### Option 1: Browser Preview

Open `index.html` in a modern browser to enter the home navigation page.
You can also open a planet page directly, such as `earth.html`, `mars.html`, or `saturn.html`.

### Option 2: Lively Wallpaper

1. Open Lively Wallpaper.
2. Choose `Add Wallpaper`.
3. Import `index.html` from the project root to use the home page as the main entry.
4. If needed, import any individual planet page instead.

### Option 3: GitHub Pages Deployment

This repository is ready for GitHub Pages deployment as a static site.

1. Push the repository to GitHub.
2. Enable GitHub Pages in repository settings.
3. Select `main` or the repository root as the publishing source.
4. Your project will be available at `https://<username>.github.io/<repository>/`.

If you have a custom domain, configure the domain in GitHub Pages settings and add the corresponding DNS
records for your public domain.

## Repository Structure

```text
NASA-Punk_Observatory/
├─ index.html                # Home page entry
├─ earth.html ... sun.html   # Planet page entries
├─ styles/                   # Style sheets and transition styles
├─ scripts/                  # Shared scripts, page assembly, config, and data-driven logic
├─ docs/                     # Maintenance and documentation files
├─ LICENSE                  # MIT license
├─ readme.md                # Chinese project readme
└─ README.en.md             # English project readme
```

## Data Visualization Notes

This version maps Chinese aerospace datasets to the planetary presentation:

- Mars uses Tianwen-1 science data volume to drive particle count and scene progression.
- Jupiter uses Chinese deep-space mission mileage to control particle density and visual scale.
- Saturn uses lunar sample data to shape ring particle distribution.
- Uranus and Neptune use spacecraft counts and industry scale data to drive atmosphere and particle patterns.
- Sun, Mercury, Venus, and Earth each have custom particle generation rules based on their narrative theme.

## Visual and Performance Enhancements

- Earth is rendered with million-level particle density for finer detail.
- Initialization delay and asynchronous generation reduce load spikes and improve perceived performance.
- Page transition logic is stabilized to avoid flashing during navigation.
- The UI retains the NASA-Punk aesthetic while improving readability and planet-specific color cues.

## Acknowledgements and License

This project is derived from `flowersauce/NASA-Punk_Observatory` and extended by `ZZY-STACK`.We would like to express our sincere gratitude to the original author for their contributions.

- Original author: `flowersauce`
- Current author: `ZZY-STACK`

This repository is released under the MIT License. See [LICENSE](LICENSE) for details.

If you reuse or fork this project, please keep the original attribution and note the derived work.


---

