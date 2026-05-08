# Release Checklist

## Product

- [ ] Define target buyer and product positioning.
- [ ] Decide which features are enabled in the paid version.
- [ ] Keep expression/habit analysis opt-in.
- [ ] Add first-run onboarding screenshots.

## Privacy and Legal

- [ ] Review privacy policy with counsel.
- [ ] Review terms with counsel.
- [ ] Add explicit consent before camera and habit tracking.
- [ ] Add data retention controls.
- [ ] Add clear "no video recording" statement in app.

## Engineering

- [x] Add versioned Windows release zip.
- [x] Add Windows Apps uninstall entry.
- [x] Add bundled app icon for shortcuts and tray.
- [ ] Package as a signed Windows installer.
- [ ] Bundle MediaPipe assets locally or disclose CDN dependency.
- [ ] Harden local server endpoints.
- [ ] Add versioned migrations for local storage.
- [ ] Add diagnostics export.
- [ ] Add automated UI smoke tests.
- [ ] Add crash/error logging with opt-in only.

## Beta

- [ ] Test with at least 10 users.
- [ ] Test multiple webcams and laptop models.
- [ ] Tune false positives.
- [ ] Document known limitations.
- [ ] Prepare support email and troubleshooting guide.
