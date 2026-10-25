# GroundedHuman project page

Static paper homepage based on the selected Scheme A research gallery design.

Open `index.html` directly, or preview with a local server:

```powershell
python -m http.server 4173
```

Then visit http://localhost:4173/. No build step or external dependencies are required.

The five comparison sequences are defined in `script.js`. The 18 videos live in
`public/assets/videos/`; still previews from the supplied supplementary PDF
are in `public/assets/posters/`. Manuscript figures are in
`public/assets/paper/`, alongside `GroundedHuman_arxiv.pdf`. The header and
hero Paper PDF links open that local copy in a new tab. The page shows a still
preview if a video is missing.
The image thumbnails switch between sequences. Muted videos start automatically
when the comparison is in view and pause when it leaves the viewport.

To publish, upload `index.html`, `styles.css`, `script.js`, and `public/` to
any static web host. Keep `public/` next to `index.html` so the media paths
resolve.
