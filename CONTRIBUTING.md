# Contributing to Orbitalis

Thanks for helping make global visualization easier to build in Vue and React.

## Report a bug

Open an issue with the implementation (`Vue` or `React`), browser/OS, steps to reproduce, expected/actual behavior, console errors, and a screenshot when helpful. For rendering problems, include screen resolution, quality settings, GPU when known, and approximate data size. Remove credentials and private operational data from reproductions.

## Propose a feature

Describe the visualization problem and intended use: digital-twin overview, logistics, large-screen display, IoT, or another scenario. Small examples make proposals easier to evaluate. Roadmap entries are ideas rather than delivery commitments.

## Work locally

1. Fork and clone the repository.
2. Choose `globe-3d-map-vue/` or `globe-3d-map-react/`.
3. Run `npm ci`, then `npm run dev`.
4. Make a focused change and run `npm test`, `npm run typecheck`, and `npm run build`. For React, also run `npm run lint -- src`.
5. Open a pull request describing behavior, verification, and any visual differences. Include before/after screenshots for UI changes.

Each implementation has its own dependencies. Avoid committing `node_modules`, build output, local logs, or caches. If a change affects both implementations, explain and test each one separately.

## Design and code conventions

- Preserve `[longitude, latitude]` ordering and stable IDs.
- Keep geographic math in `src/globe/math/`, data validation in services, and scene rendering in layers.
- React code uses TypeScript. Keep UI and scene state properly typed.
- Every listener, timer, observer, RAF loop, tween, geometry, material and texture needs a clear owner and cleanup path.
- Do not present planned features or unmeasured performance targets as implemented guarantees.
- Keep English and Chinese documentation/labels aligned.
- Record attribution and licensing for new third-party assets.

By contributing code, you agree that your contribution is distributed under the project's MIT license. Third-party assets must retain their own applicable terms.
