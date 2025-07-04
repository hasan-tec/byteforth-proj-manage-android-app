#!/bin/bash

# This is a helper script to verify that the Expo export command works correctly
# Run this locally before pushing to GitHub to make sure the build will work on Vercel

echo "Testing Expo web build..."
rm -rf dist
npx expo export --platform web

if [ -d "dist" ]; then
  echo "✅ Build successful! The 'dist' folder was created."
  echo "You should be good to deploy to Vercel now."
else
  echo "❌ Build failed! No 'dist' folder was created."
  echo "Check the error messages above to troubleshoot."
fi
