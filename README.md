# ECHO — The AI That Understands You

A dark, immersive browser experience that simulates a behavior-based AI analysis engine. The app tracks user interactions like mouse movement, clicks, scrolls, and key presses, then displays a stylized result screen after a dramatic animated sequence.

## Project Structure

- `index.html` — main page markup and UI structure
- `style.css` — visual styling, animations, and immersive UI effects
- `app.js` — core application logic, behavior tracking, simulated AI typing, result generation, and audio/visual transitions
- `server.ps1` — simple PowerShell static file server for local development

## Features

- Landing experience with cinematic UI overlay
- Custom cursor and ambient glitch effects
- Behavior tracking for mouse movement, clicks, scroll, key presses, idle time, and hesitation
- Animated terminal-style output and analysis progress
- Result summary view with personalized metrics and share/retry actions
- Responsive to device type and user environment

## Installation

No build tools are required. This is a static HTML/CSS/JavaScript project.

1. Open the folder in your browser or a local server.
2. Load `index.html`.

### Optional: Run with PowerShell server

If you want to serve the project locally via the included PowerShell script:

1. Open PowerShell.
2. Run `.\irst\ensure\the\path\is\correct\server.ps1` after updating the hardcoded `rootPath` inside `server.ps1` to the project folder.
3. Open `http://localhost:3000/` in your browser.

> Note: `server.ps1` currently uses a hardcoded `rootPath` and should be updated to match your local project location before running.

## Usage

- Click the `BEGIN` button to start the ECHO experience.
- Interact with the page through movement, clicks, scrolls, and key presses.
- At the end, review the AI analysis result and choose to retry or share.

## Customization

- Edit `style.css` to change the visual appearance, color theme, or animation behavior.
- Edit `app.js` to adjust typing speed, pacing, audio settings, or the analysis result logic.

## Notes

- The experience is entirely client-side and does not require server-side data storage.
- The simulation is designed to feel like a neural analysis engine rather than to collect meaningful personal data.

## License

Use freely for demos, prototypes, or creative experiments.
