#!/bin/bash
# Script to start Expo with proper file descriptor limits

# Increase file descriptor limit
ulimit -n 65536

# Reset Watchman if needed
watchman shutdown-server 2>/dev/null
watchman watch-del-all 2>/dev/null

# Clear Expo cache
rm -rf .expo

# Start Expo
npx expo start --clear

