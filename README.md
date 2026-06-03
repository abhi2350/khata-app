# KHATA

A simple Android app to manage a personal ledger — store names with their corresponding page numbers, search entries, and keep everything persisted locally.

## Features

- **Card list** — each entry displayed as a card with page number, name, and timestamp
- **Add / Edit** — popup form to create or update an entry
- **Delete** — confirmation dialog before removing an entry
- **Search** — real-time search by name
- **Toast notifications** — feedback on add, edit, and delete actions
- **Local persistence** — all data stored with AsyncStorage (no backend required)

## Tech Stack

- [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 56)
- [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/)
- [@expo/vector-icons](https://docs.expo.dev/guides/icons/) — MaterialIcons

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your Android device

### Run locally

```bash
npm install
npx expo start --android
```

Scan the QR code with Expo Go to launch on your device.

### Build APK

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

The EAS build server will produce a downloadable `.apk` file.

## Project Structure

```
khata/
├── App.js          # All screens and logic
├── app.json        # Expo config (name, icon, package)
├── eas.json        # EAS build profiles
└── assets/
    ├── icon.png
    └── adaptive-icon.png
```

## License

MIT
