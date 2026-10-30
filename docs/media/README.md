# 3D-global-Orbitails showcase / 功能演示

- [1080p / 60 fps MP4](orbitails-showcase-1080p60.mp4) — full-quality, 35-second walkthrough.
- [1080p animated GIF](orbitails-showcase-1080p.gif) — about 21 seconds, 10 fps, looping.
- Local recording master: `media/recordings/orbitails-master-take02-1080p60.mkv` — 52 seconds, 1920 × 1080, 60 fps. **Preserved, not deleted.**

The raw recording and capture checks stay in the project folder under `media/recordings/`. They are ignored by Git because recording masters are much larger than the edited deliverables. The MP4 and GIF are published with the project. No microphone, system audio, or unrelated desktop window was recorded.

## What the walkthrough shows

| Edited video | Features |
| --- | --- |
| 0–6 s | Daytime Earth, global network, pointer-directed zoom |
| 6–9 s | Bars and route-layer visibility |
| 9–15 s | Nighttime, deep blue, violet, amber and grid surface |
| 15–20 s | Particle/star density and English/Chinese controls |
| 20–25 s | Node focus, tooltip, country selection and boundary highlight |
| 25–27 s | Drag navigation and camera motion |
| 27–35 s | Vue implementation and nighttime Earth |

The transitions and geographic scene are rendered by the real applications. Only the recording's idle/loading interval is cut; bilingual chapter captions are added. The GIF uses a 0.6 playback-time multiplier to fit the same demonstration into a short loop.

## Recording method

1. Start the React and Vue apps on local ports 5173 and 5174.
2. Use a dedicated Chromium window with a **1920 × 1080 viewport at DPR 1**. Disable background timer/render throttling in this recording-only browser session.
3. Let the app select its medium quality preset at a narrower startup viewport, then resize to 1920 × 1080. The captured pixels are native 1080p, not an upscaled 720p recording.
4. Use FFmpeg's **Windows Graphics Capture (`gfxcapture`)** against the dedicated browser's HWND. This captures the target window even when other windows overlap it.
5. Capture at up to 60 Hz, crop browser chrome, and encode the recording as H.264 with a **60 fps constant-frame-rate timeline**. The original screen-capture source can emit fewer distinct frames when the application renders below 60 fps; repeated frames maintain the 60fps recording timebase. No AI frame interpolation is used. The video's frame rate is not a benchmark of the application's rendering speed.
6. Run the real UI interactions with Playwright CLI using [`walkthrough.js`](walkthrough.js).
7. Keep the original MKV. Trim loading/idle time, add [`showcase.ass`](showcase.ass) captions and encode MP4 with H.264 CRF 18, `yuv420p`, and `faststart`.
8. Generate the full-resolution GIF with a 256-color palette and ordered dithering. GIF frame rate is intentionally lower than the MP4 frame rate.

OBS was not required. This machine's installed FFmpeg NVENC version required a newer NVIDIA driver, so the delivered recording uses software H.264 encoding without changing any drivers or OBS settings.

## Reproduce the edit

From the repository root, with FFmpeg and the original master available:

```powershell
pwsh -NoProfile -File docs/media/edit-showcase.ps1
```

The edit keeps raw seconds 0–27 and 42–50, removing the version-switch loading interval. The script never removes the input MKV. Export to new filenames, or move old deliverables aside, when producing another revision.

Inspect the output metadata:

```powershell
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,avg_frame_rate,nb_frames -show_entries format=duration -of json docs/media/orbitails-showcase-1080p60.mp4
```

Earth imagery: NASA Blue Marble / Black Marble. Demo records and metrics are illustrative. See the root [third-party notices](../../THIRD_PARTY_NOTICES.md).
