# Troubleshooting Guide

## EMFILE: too many open files

### Quick Fix
```bash
# Clear Metro cache and restart
npx expo start --clear
```

### Permanent Fix: Install Watchman

**Using Homebrew (Recommended):**
```bash
brew install watchman
```

**Verify installation:**
```bash
watchman --version
```

**Restart Metro:**
```bash
npx expo start --clear
```

### Alternative: Increase File Descriptor Limit

If you can't install Watchman, you can increase the limit:

```bash
# Check current limit
ulimit -n

# Increase limit (temporary - resets after terminal closes)
ulimit -n 4096

# Or add to ~/.zshrc for permanent:
echo "ulimit -n 4096" >> ~/.zshrc
source ~/.zshrc
```

## Package Version Warnings

If you see warnings about package versions, you can update them:

```bash
npx expo install --fix
```

This will automatically update packages to versions compatible with your Expo SDK.

## Metro Bundler Issues

### Clear Cache
```bash
npx expo start --clear
```

### Reset Everything
```bash
rm -rf node_modules
rm -rf .expo
npm install
npx expo start --clear
```

## Authentication Errors

### Supabase Connection Issues
- Check your `.env` file has correct values
- Verify Supabase project is active
- Check network connection

### Stripe Payment Issues
- Verify Stripe keys are correct
- Use test mode keys for development
- Check Stripe dashboard for errors

## iOS Simulator Issues

### Simulator Won't Open
```bash
# Kill all simulators
killall Simulator

# Reset simulator
xcrun simctl erase all
```

### Build Errors
```bash
cd ios
pod install
cd ..
npx expo run:ios
```

## Android Emulator Issues

### Emulator Won't Start
- Check Android Studio is installed
- Verify AVD (Android Virtual Device) is created
- Check emulator is not already running

### Build Errors
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

## Common Errors

### "Module not found"
```bash
npm install
# or
rm -rf node_modules && npm install
```

### "TypeScript errors"
```bash
# Check tsconfig.json is correct
npx tsc --noEmit
```

### "RLS policy violation"
- Ensure user has a profile in Supabase
- Check RLS policies are applied
- Verify user is authenticated

## Getting Help

1. Check Expo documentation: https://docs.expo.dev
2. Check Supabase logs in dashboard
3. Check Metro bundler output for errors
4. Review error messages carefully

