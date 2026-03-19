# Metronome PWA

Installable React + Vite metronome app with:

- time signature inputs
- BPM input with + / - controls
- single flashing beat square
- optional audio click
- PWA manifest and service worker for install on phone

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm install
npm run build
npm run preview
```

## Deploy

Build the app and deploy the generated `dist` folder to your hosting platform, or connect the repo to a host such as Netlify, Vercel, GitHub Pages, or similar.

For installability on a phone, the deployed site must be served over HTTPS.
