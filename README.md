# VYBE

Vybe is a lightweight audio visualizer built with React, TypeScript, and the Web Audio API. It turns live audio from a microphone, browser tab, or uploaded file into a responsive animated waveform experience.

## Overview

This project creates a fullscreen, immersive visualizer that reacts to audio in real time. The interface stays minimal so the focus remains on the motion and color of the generated visuals while still providing simple controls for playback and source selection.

## Features

- Upload any local audio file and play it back inside the visualizer
- Capture live audio from your microphone
- Share tab audio from supported browsers
- Drag and drop an audio file anywhere on the page to start playing
- Pause/play controls and seeking for file-based audio
- Fullscreen, animated bar-based visualization driven by the analyser node
- Lightweight, single-page app with a modern dark UI

## Tech Stack

- React 18
- TypeScript
- Vite
- Framer Motion
- Web Audio API

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Install dependencies

```bash
npm install
```

### Run the app locally

```bash
npm run dev
```

Then open the local URL printed by Vite in your browser, typically:

```text
http://localhost:5173
```

## Build for Production

```bash
npm run build
```

This runs TypeScript checks and produces a production build in the `dist` directory.

## Project Structure

```text
vybe/
├── index.html
├── package.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── audio/
│   │   ├── AudioEngine.ts
│   │   ├── types.ts
│   │   └── sources/
│   │       ├── file.ts
│   │       ├── index.ts
│   │       └── streams.ts
│   ├── components/
│   │   ├── CanvasHost.tsx
│   │   ├── Controls.tsx
│   │   └── Scrubber.tsx
│   ├── hooks/
│   │   └── useIdle.ts
│   └── visualizers/
│       ├── bars.ts
│       └── types.ts
└── tsconfig.json
```

## How It Works

The app creates a shared `AudioEngine` that owns the Web Audio context, analyser node, and current media source. The engine connects whichever source is active (file, mic, or tab audio) and continuously reads frequency and waveform data from the analyser.

A visualizer module (`bars.ts`) then translates that data into animated bar heights and color gradients, which are drawn on a canvas. The UI layer provides simple source selection and transport controls without disrupting the render loop.

## Browser Notes

- Microphone access requires a secure context and browser permission approval.
- Tab audio capture works best in Chromium-based browsers and requires choosing the browser tab and enabling "Share tab audio" when prompted.
- Audio file uploads are accepted for common formats such as MP3, WAV, M4A, OGG, and FLAC.

## License

This project does not currently include a license file. If you plan to distribute or reuse it publicly, add an appropriate open-source license before sharing.
