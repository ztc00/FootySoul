# Quick Fix for EMFILE Error

## Option 1: Install Watchman (Best Solution)

Run these commands in your terminal:

```bash
sudo chown -R $(whoami) /usr/local/share/man/man8
chmod u+w /usr/local/share/man/man8
brew install watchman
```

Then start Expo:
```bash
npx expo start --clear
```

## Option 2: Use Polling Mode (Temporary Workaround)

I've updated `metro.config.js` to use polling instead of file watching. This is slower but works without watchman.

Try starting Expo again:
```bash
npx expo start --clear
```

**Note:** Polling mode is slower and uses more CPU. Installing watchman (Option 1) is strongly recommended.

## Option 3: Update Package Versions

You can also update packages to recommended versions:

```bash
npx expo install --fix
```

This will update packages to versions compatible with Expo SDK 51.

