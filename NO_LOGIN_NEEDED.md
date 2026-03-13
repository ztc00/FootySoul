# No Expo Account Needed for Development

## You Don't Need to Login!

For local development with Expo Go, you **do NOT need an Expo account**. The login prompt appears when trying to open the iOS simulator, but you can work around it.

## Option 1: Use Expo Go App (Recommended)

1. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Start the server** (without opening simulator):
   ```bash
   npx expo start
   ```

3. **Scan the QR code** with:
   - iOS: Camera app
   - Android: Expo Go app

4. **Press `s`** to switch to Expo Go mode if needed

## Option 2: Skip Login for Simulator

If you want to use the simulator without logging in:

1. Press `Ctrl+C` to stop the current server
2. Start without auto-opening:
   ```bash
   npx expo start --no-dev-client
   ```
3. Then manually press `i` for iOS or `a` for Android when ready

## Option 3: Create Free Expo Account (Optional)

If you want to use EAS features later (builds, updates, etc.), you can create a free account:

```bash
npx expo register
```

But this is **NOT required** for basic development!

## Current Issue: Missing Assets

The app is complaining about missing icon files. I've created placeholder references. The app will still run, but you'll see warnings.

To fix properly later:
1. Create or download app icons
2. Place them in the `assets/` folder
3. Or use: `npx expo install expo-asset` and generate them

## Quick Start (No Login)

```bash
# Stop current server (Ctrl+C if running)

# Start fresh without login prompts
npx expo start --no-dev-client

# Then scan QR code with Expo Go app on your phone
```

---

**TL;DR**: You don't need an account! Just use Expo Go app on your phone and scan the QR code. 🚀

