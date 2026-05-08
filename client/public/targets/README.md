# MindAR target files

The `/dent-demo` route now uses **automatic in-browser compilation** for this local target image:

- `signj-n-target.svg`

Behavior:
1. On load, the app compiles `signj-n-target.svg` into temporary `.mind` data in memory.
2. It starts MindARThree with that compiled target.
3. If compilation fails, it falls back to MindAR's sample marker.

For OBS Virtual Camera / GMod testing:
- Show `signj-n-target.svg` clearly in the camera feed.
- Keep the whole square visible and avoid heavy blur.
- Start at medium distance, then move closer.
