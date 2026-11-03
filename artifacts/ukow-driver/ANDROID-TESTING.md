# Android test app

This is the existing UK On Wheels Driver app, linked to the Expo project in
`app.json`. The `preview` EAS profile produces an installable release APK, not a
development client. Expo Go and a running Metro server are not required to use it.

## Prepare the Android cloud build

Use the connected Expo project `@ghulam7913s-team/uk-on-wheels-ltd`.
Its GitHub repository must contain this complete mobile app and the matching
root pnpm lockfile. Set the project's GitHub base directory to
`artifacts/ukow-driver`. The portal website alone cannot produce a native app.

Use the Expo website's Android build flow with profile `preview` and a branch
containing this mobile app. Do not select automatic app-store submission.
The first Android build may need additional setup before GitHub builds are
available. Follow the current Expo dashboard requirements; do not confuse
Replit's managed Expo Go preview sign-in with the app owner's build account.

Keep an existing Android signing keystore if one is already configured.
If this is the app's first signing identity, generate it through Expo's
supported credential setup. Never replace existing signing keys merely to
fix a build. Do not paste passwords, signing files or service-account keys
into chat.

The cloud build displays its progress link. Once it finishes, open its install
link on the Android phone and install the APK. Android may ask permission for the
browser to install this app.

## Check on the installed phone

- Sign in with a real Driver account and verify that only that Driver's data is
  visible.
- Check Assigned, Active, Delivered, Incidents, Holidays, Payments, Digital ID
  and Profile. Delivered must not duplicate a separate History destination.
- Take and upload inspection photos, save the answers and reopen the booking.
  Confirm Admin and the correct Client can still see the saved evidence.
- Allow notifications. Assign a job and send instructions from Admin while the
  phone is locked; confirm delivery on the installed app. This cannot be proven
  by Expo Go, a local notification, or just allowing notification permission.
- Check that the app reopens and works without a Replit development server.
- On an assigned picked-up job, start location sharing with the requested
  foreground and background permissions. Confirm that Admin and the correct
  Client see real location updates while the phone is locked, and that delivery,
  reassignment and stopping sharing prevent further reporting. This needs a
  real installed phone; automated tests do not prove background GPS behaviour.

This profile does not submit anything to Google Play. A successful JavaScript
export is a preparation check, not proof that a signed APK was built or that
physical-device camera and push delivery work.
