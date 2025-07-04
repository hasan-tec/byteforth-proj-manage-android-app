# ByteForth Management App

A React Native app built with Expo that can be deployed on web, iOS, and Android.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Web Deployment

This app is configured to deploy on Vercel:

```bash
# Build for web
npm run build

# Test the build locally
npm start
```

## Mobile Builds

To create mobile builds, use Expo's build system:

```bash
# Build for Android
eas build -p android

# Build for iOS
eas build -p ios
```

## Environment Variables

The app uses the following environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
