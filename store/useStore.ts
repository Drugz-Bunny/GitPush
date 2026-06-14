// store/useStore.ts
import { create } from 'zustand';
import type { Repo, FileUpload } from '../services/github';

interface AppState {
  token: string | null;
  username: string | null;
  avatarUrl: string | null;
  repos: Repo[];
  selectedRepo: Repo | null;
  files: FileUpload[];
  commitMessage: string;
  uploadBranch: string;

  setAuth: (token: string, username: string, avatarUrl: string) => void;
  logout: () => void;
  setRepos: (repos: Repo[]) => void;
  selectRepo: (repo: Repo | null) => void;
  addFiles: (files: FileUpload[]) => void;
  removeFile: (path: string) => void;
  clearFiles: () => void;
  updateFilePath: (oldPath: string, newPath: string) => void;
  setCommitMessage: (msg: string) => void;
  setUploadBranch: (branch: string) => void;
}

export const useStore = create<AppState>((set) => ({
  token: null,
  username: null,
  avatarUrl: null,
  repos: [],
  selectedRepo: null,
  files: [],
  commitMessage: '',
  uploadBranch: 'main',

  setAuth: (token, username, avatarUrl) => set({ token, username, avatarUrl }),
  logout: () => set({ token: null, username: null, avatarUrl: null, repos: [], selectedRepo: null, files: [] }),
  setRepos: (repos) => set({ repos }),
  selectRepo: (repo) => set({ selectedRepo: repo, uploadBranch: repo?.default_branch || 'main' }),
  addFiles: (newFiles) =>
    set((s) => {
      const existing = new Map(s.files.map((f) => [f.path, f]));
      newFiles.forEach((f) => existing.set(f.path, f));
      return { files: Array.from(existing.values()) };
    }),
  removeFile: (path) => set((s) => ({ files: s.files.filter((f) => f.path !== path) })),
  clearFiles: () => set({ files: [] }),
  updateFilePath: (oldPath, newPath) =>
    set((s) => ({
      files: s.files.map((f) => (f.path === oldPath ? { ...f, path: newPath } : f)),
    })),
  setCommitMessage: (commitMessage) => set({ commitMessage }),
  setUploadBranch: (uploadBranch) => set({ uploadBranch }),
}));
