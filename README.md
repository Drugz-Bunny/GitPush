# GitPush — Android GitHub Client

A sleek, minimal Android app for pushing code files and directories to GitHub from your mobile device.

## Features

- 🔐 **Secure token auth** — PAT stored locally via AsyncStorage
- 📁 **File picker** — Pick multiple files from anywhere on device
- 📂 **Repo browser** — List, search, and create repositories
- ✏️ **Commit messages** — Full commit message editor with preset prefixes (feat, fix, docs...)
- 🌿 **Branch control** — Push to any branch
- 🗂️ **Path editing** — Long-press any file to rename its repo path
- 📊 **Push progress** — Live progress bar with file-by-file status
- 🌑 **Dark theme** — Terminal-inspired, electric green accent

## Setup

### Prerequisites
- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`

### Install

```bash
cd GitPush
npm install
```

### Run on device (Expo Go)

```bash
npx expo start
```

Scan QR with Expo Go app. Note: DocumentPicker requires a development build for full functionality.

### Development Build (recommended for Android)

```bash
eas build --platform android --profile preview
```

This produces an APK you can install directly.

### eas.json (create this file)

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  }
}
```

## GitHub Token

1. Go to: https://github.com/settings/tokens/new
2. Required scopes: `repo`, `read:user`
3. Paste token into the app login screen

## Architecture

```
app/
  _layout.tsx     — Root layout (navigation, providers)
  index.tsx       — Auth screen (token login)
  repos.tsx       — Repository list + create
  upload.tsx      — File picker + commit + push

services/
  github.ts       — GitHub REST API v3 wrapper

store/
  useStore.ts     — Zustand global state

constants/
  theme.ts        — Design tokens (colors, spacing, radius)
```

## Usage Flow

1. **Login** → paste GitHub PAT
2. **Select repo** → tap existing or create new
3. **Add files** → tap + ADD or the drop zone
4. **Set branch** → defaults to repo's default branch
5. **Write commit message** → use presets or type freely
6. **Push** → tap PUSH TO GITHUB, watch progress
7. **Long-press a file** → edit its path in the repository

## Termux / Android Notes

- Built with Expo + React Native for Android-first use
- Works with Termux-generated files (copy to Downloads, then pick)
- No cloud sync — everything is local + GitHub direct
- Token never leaves device (no proxy server)
