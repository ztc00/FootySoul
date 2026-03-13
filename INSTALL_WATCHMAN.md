# Install Watchman - Manual Steps

## Fix Homebrew Permissions

Run these commands in your terminal (you'll be prompted for your password):

```bash
sudo chown -R $(whoami) /usr/local/share/man/man8
chmod u+w /usr/local/share/man/man8
```

## Install Watchman

```bash
brew install watchman
```

## Verify Installation

```bash
watchman --version
```

## Start Expo

After watchman is installed, start Expo:

```bash
npx expo start --clear
```

---

## Alternative: Work Without Watchman

If you can't install watchman right now, you can still run the app:

1. The Metro config I created should help reduce file watching
2. Try starting with: `npx expo start --clear`
3. If you still get EMFILE errors, you can temporarily increase the limit:
   ```bash
   ulimit -n 4096
   npx expo start
   ```

However, watchman is highly recommended for React Native development as it significantly improves file watching performance.

