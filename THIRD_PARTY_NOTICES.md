# Third-party notices

The root MIT license covers this project's original code. It does not replace the terms of dependencies, imagery, geographic datasets, or trademarks.

## Earth imagery

Both implementations bundle `src/assets/textures/earth-day.jpg` and `earth-night.jpg`.

| Image | Recorded source | Resolution | SHA-256 |
| --- | --- | --- | --- |
| Daytime | NASA Blue Marble, mirrored in `three-globe@2.45.2/example/img/earth-blue-marble.jpg` | 4096 × 2048 | `228DEBA2E4B600146BDCB6CFA359B8EAD6AACC2B1C13550A29CD82824CFA1C01` |
| Nighttime | NASA Black Marble, mirrored in `three-globe@2.45.2/example/img/earth-night.jpg` | 4096 × 2048 | `355AB23DD1323315B393D7B91DD2D7EE223A1CBAABA2B48DC72BA90D371CED24` |

Credit: **Earth imagery: NASA Blue Marble / Black Marble.** No endorsement by NASA is implied.

Source and usage references:

- [NASA Blue Marble](https://svs.gsfc.nasa.gov/30763/)
- [NASA Black Marble](https://svs.gsfc.nasa.gov/30876/)
- [NASA Images and Media Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- [Fixed-version daytime mirror](https://cdn.jsdelivr.net/npm/three-globe@2.45.2/example/img/earth-blue-marble.jpg)
- [Fixed-version nighttime mirror](https://cdn.jsdelivr.net/npm/three-globe@2.45.2/example/img/earth-night.jpg)

Retain imagery attribution when redistributing the bundled images or screenshots. The images are not relicensed as original 3D-global-Orbitails artwork.

## Geographic data

`world-atlas@2.0.2` supplies low-resolution country and land TopoJSON derived from Natural Earth. The package is ISC licensed; Natural Earth data is public domain. `topojson-client@3.1.0` performs TopoJSON conversion (ISC). Geographic processing also uses `d3-geo@3.1.1` (ISC).

- [world-atlas](https://github.com/topojson/world-atlas)
- [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/)
- [topojson-client](https://github.com/topojson/topojson-client)
- [d3-geo](https://github.com/d3/d3-geo)

These outlines serve global visualization and are not authoritative boundary determinations.

## Runtime and build dependencies

Three.js, React, Vue, Vite and other dependencies retain their upstream licenses. GSAP is distributed under its own upstream license; review the license bundled with the pinned dependency before redistribution or embedding in another product. Consult the lockfiles for exact dependency versions and installed packages for their license text.

Do not infer that all dependencies have the same license as this repository. Framework logos and names belong to their respective owners.

## Demo data and screenshots

The location values, priorities and route relationships are synthetic examples. Land waypoints and auto-generated sea paths are illustrative. README screenshots are captured from the applications with these bundled records.

The earlier `china-3d-map1` reference project, local dependency backups, caches, and generated builds are excluded from the public source repository.
