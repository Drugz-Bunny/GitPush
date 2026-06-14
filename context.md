# GitPush — Context for Claude

## Project
Android app (Expo + React Native) for pushing code to GitHub from mobile. 3-screen app: Auth → Repos → Upload.

## Tech Stack
- Expo ~52, expo-router ~4
- expo-document-picker (file picking)
- expo-file-system (base64 encode)
- zustand (state)
- AsyncStorage (token persistence)
- GitHub REST API v3 (direct, no proxy)

## File Structure
```
app/_layout.tsx       Root layout
app/index.tsx         Auth / login screen
app/repos.tsx         Repo list + create repo
app/upload.tsx        File picker, commit msg, push
services/github.ts    GitHub API wrapper
store/useStore.ts     Zustand state
constants/theme.ts    Design tokens
```

## Design
- Dark terminal aesthetic: bg #0a0a0a, accent #39d353 (GitHub green)
- Monospace fonts (Courier New) for code/paths
- Cards with #161616 bg, #222222 borders

## State (useStore)
- token, username, avatarUrl
- repos[], selectedRepo
- files[] (FileUpload: {path, content (base64), name})
- commitMessage, uploadBranch

## Key Flows
1. Token → getUser() → store auth → navigate /repos
2. Select repo → selectRepo() → navigate /upload
3. Pick files → uriToBase64 → addFiles()
4. Push → uploadFiles() iterates, PUT /repos/{owner}/{repo}/contents/{path}
5. Long-press file row → modal to edit repo path

## Pending / Next Steps
- Directory picker (needs native module or workaround via SAF)
- Recent commits history screen
- Multi-account support
- Diff preview before push
- Git ignore filter
- Share sheet target (receive files from other apps)
