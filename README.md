# CFPA CrossFit Stream Overlay — Prototype

Responsive HTML5/CSS/JavaScript prototype for a CrossFit streaming overlay with three zones, a timer, editable branding, logo upload, workout details, local layout saving and a separate transparent output page.

## Included
- `index.html` — responsive control panel and visual preview.
- `overlay.html` — transparent 16:9 output for OBS Browser Source.
- `css/styles.css` — dashboard and preview styles.
- `css/overlay.css` — transparent overlay output styles.
- `js/app.js` — controls, timer, local save/export and cross-tab sync.
- `js/overlay.js` — output page state receiver.

## Quick start
1. Unzip the project.
2. Run it through a local web server. For example, in this folder run `python -m http.server 8000`.
3. Open `http://localhost:8000/index.html` in a modern browser.
4. Click **Overlay öffnen** to open `overlay.html` in a second tab/window.
5. In OBS Studio, add a **Browser Source** pointing to `http://localhost:8000/overlay.html` and set the size to `1920 × 1080`.

Both pages should share the same origin for BroadcastChannel synchronization. Opening the HTML files directly with `file://` can restrict storage and cross-tab messaging, so a local server is recommended.

## Zoom / Streamlabs
- **OBS Studio:** Browser Source is the intended path. Confirm transparency in OBS and use the 1920×1080 canvas.
- **Streamlabs Desktop:** Browser source support varies by version; verify the output on the target machine.
- **Zoom:** Start OBS Virtual Camera in OBS, then choose **OBS Virtual Camera** as the camera in Zoom. The exact menu names can vary by version. This prototype does not itself create a virtual camera.
- The project is a prototype and has not been tested on the user's specific OBS/Streamlabs/Zoom installation.

## Dependencies
- Bootstrap 5.3.3 CSS via jsDelivr CDN.
- jQuery 3.7.1 via code.jquery.com.
- Google Fonts (Barlow Condensed and Inter) via Google Fonts.
- Preview uses a remote Unsplash gym photo. The actual `overlay.html` remains transparent and does not depend on that photo.
- No paid library is required by this prototype. External CDN/network access is needed for Bootstrap, jQuery, fonts and preview image. For a fully offline setup, download/vendor these assets locally and update the references.

## Feature scope in this prototype
### Included
- Three zones and responsive dashboard preview.
- Countdown, stopwatch, start/pause/reset.
- Basic interval demo alternating work/rest; round count.
- Editable brand title/subtitle, workout title, coach name and information text.
- Upload/remove a logo in the current browser session.
- Accent color, timer color shift, show/hide zones and clock.
- Keyboard shortcuts: Space starts/pauses, R resets (when not typing in a field).
- Save layout in browser localStorage and export settings as JSON.
- Separate transparent overlay output page with live cross-tab synchronization in modern browsers.

### Limited / not yet production-ready
- Mobile/tablet remote control: no networked remote-control interface; current settings are controlled from the same browser.
- Advanced time-sequence parser such as `2m + 30 + 1:00`, complex interval chains, persistent named scenes, animations, participant/sponsor fields and chat panels are not implemented.
- Timer settings and interval transitions should be tested against the exact training workflow before live use.
- The preview's gym photo is decorative only; the output overlay is transparent.

## Code and rights
The source files are readable and included. No code obfuscation is used. Third-party libraries and assets remain subject to their own licenses/terms. This project is a starter prototype; confirm any commercial/exclusive rights and acceptance terms in writing before using it as a paid deliverable.
