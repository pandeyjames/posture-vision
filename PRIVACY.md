# Posture Vision Privacy Policy

Posture Vision is designed as a local-first posture and habit monitoring app.

## Data Processing

- Webcam frames are processed locally in your browser.
- Video is not recorded by the app.
- Audio is not recorded by the app.
- Webcam images or screenshots are not saved by the app.
- Video frames are not uploaded to a server by this app.
- Pose, posture, habit, and expression-signal summaries are stored locally in a SQLite database on this computer.
- Browser storage may be used as a cache/fallback, but the primary saved copy is the local database.

## Local Data Stored

The app may store:

- Calibration baseline
- App settings
- Consent choice
- Daily posture summaries
- Calibration profiles
- Optional habit event logs
- Optional expression-signal counters

The database file is stored at `data\posture-vision.db` inside the Posture Vision app folder.

## Sensitive Features

Habit tracking and expression signals are optional. These features infer visible patterns from webcam landmarks. They do not determine your actual emotions, intent, health condition, or identity.

## Data Export and Deletion

You can export or reset statistics and habit logs from the app. You can also back up or export the local database from Settings.

Clearing browser site data for `http://127.0.0.1:8765` removes only the browser cache/fallback. To delete the primary saved data, delete `data\posture-vision.db` while the app is closed.

## Network Access

The browser app loads MediaPipe model/runtime files from external CDNs unless bundled locally in a future packaged release.

## Enterprise Use

Do not deploy this app to other users without a reviewed privacy notice, consent flow, retention policy, and security review.
