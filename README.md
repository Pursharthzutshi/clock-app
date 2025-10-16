# New Native Clock

React Native clock screen inspired by the provided mock-up. The UI features an animated analog clock, live digital time, and a static navigation strip.

## Requirements

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`) for local development

## Setup

```sh
npm install
npm run start
```

Use the Expo Dev Tools to launch the app on iOS, Android, or web.

## Project Structure

- `App.js` – main screen implementation with the analog clock plus simple Alarm, Timer, and Stopwatch tabs.
- `app.json` – Expo project configuration.
- `babel.config.js` – Babel preset configuration for Expo.

## Notes

- Emoji glyphs are used for the navigation icons to keep the sample lightweight.
- The clock updates every second; no background timers are configured.
