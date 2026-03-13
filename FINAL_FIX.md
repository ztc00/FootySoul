# Final Fix for EMFILE Error

## What I've Done

1. ✅ Installed Watchman
2. ✅ Updated packages to Expo SDK 51 compatible versions
3. ✅ Reset Watchman watches
4. ✅ Cleared Expo cache
5. ✅ Updated Metro config
6. ✅ Started Expo server

## If EMFILE Error Still Occurs

### Option 1: Use the Start Script

I've created a script that sets everything up properly:

```bash
./start-expo.sh
```

### Option 2: Manual Steps

```bash
# 1. Increase file descriptor limit
ulimit -n 65536

# 2. Reset Watchman
watchman shutdown-server
watchman watch-del-all

# 3. Clear cache and start
rm -rf .expo
npx expo start --clear
```

### Option 3: Check System Limits

If the error persists, check your system's hard limit:

```bash
# Check current limits
ulimit -a

# Check system max (requires password)
launchctl limit maxfiles
```

If the system limit is too low, you may need to increase it system-wide (requires admin access).

## Verify Watchman is Working

```bash
# Check Watchman version
watchman --version

# Check if Watchman is watching your project
watchman watch-list
```

## Alternative: Use Expo Development Build

If file watching continues to be an issue, you can use Expo's development build which has better file watching:

```bash
npx expo install expo-dev-client
npx expo run:ios
# or
npx expo run:android
```

This creates a development build that doesn't rely on Expo Go and has better file watching capabilities.

## Current Status

The Expo server should be starting in the background. Check your terminal for:
- QR code
- Connection URL
- Any error messages

If you see the QR code, the server is running successfully! 🎉

