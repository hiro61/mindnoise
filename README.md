# Mindnoise

Mindnoise is a local-first mindfulness timer for tracking meditation time and the number of distractions that appear during a session.

## Features

- Countdown and count-up meditation timer
- Duration setup by hour, minute, or direct minute input
- Maximum duration of 24 hours
- Water-fill progress animation with the current time shown inside the timer
- Distraction counting by clicking the main timer area during meditation
- Local history view with weekly calendar, daily totals, session count, and distraction count

## Privacy, Security, and Cost

- No paid APIs or cloud services are used.
- No external analytics, ads, tracking SDKs, or telemetry are included.
- No account, login, database, or server is required.
- Session history is stored only in the browser with `localStorage`.
- No secrets or API keys are needed. Do not add `.env` files to git.

## Development

This project uses React, TypeScript, and Vite.

```bash
npm install
npm run dev
npm run build
```

If `npm` is not installed on the machine, install Node.js and npm first. The app itself does not require any paid service.

## Data

Meditation records are saved under the browser storage key:

```text
mindnoise.sessions.v1
```

The saved data stays on the device and browser where the app is used.
