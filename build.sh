#!/bin/bash

# Exit on error
set -e

echo "Starting build process..."

# Make sure we have the latest Expo CLI
echo "Installing latest Expo CLI..."
npm install -g expo-cli

# Make sure we have all dependencies
echo "Installing dependencies..."
npm install

# Build the web version
echo "Building web version..."
npx expo export --platform web

# Check if the build was successful
if [ -d "dist" ]; then
  echo "Build completed successfully!"
  ls -la dist
else
  echo "Build failed, dist directory not found!"
  exit 1
fi
