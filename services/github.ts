// services/github.ts
// GitHub REST API v3 wrapper

const BASE = 'https://api.github.com';

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  pushed_at: string;
}

export interface FileUpload {
  path: string;        // path in repo e.g. "src/index.ts"
  content: string;    // base64 encoded
  name: string;       // display name
}

export interface UploadResult {
  path: string;
  success: boolean;
  sha?: string;
  error?: string;
}

async function ghFetch(token: string, path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getUser(token: string): Promise<{ login: string; avatar_url: string; name: string }> {
  return ghFetch(token, '/user');
}

export async function listRepos(token: string): Promise<Repo[]> {
  const data = await ghFetch(token, '/user/repos?per_page=100&sort=pushed&type=all');
  return data;
}

export async function createRepo(
  token: string,
  name: string,
  isPrivate: boolean,
  description?: string
): Promise<Repo> {
  return ghFetch(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name, private: isPrivate, description: description || '', auto_init: true }),
  });
}

export async function getFileSha(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<string | undefined> {
  try {
    const data = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`);
    return data.sha;
  } catch {
    return undefined;
  }
}

export async function uploadFile(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  content: string,  // base64
  message: string,
  branch: string
): Promise<{ sha: string }> {
  const sha = await getFileSha(token, owner, repo, filePath);
  const body: Record<string, unknown> = { message, content, branch };
  if (sha) body.sha = sha;

  const data = await ghFetch(token, `/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return { sha: data.content?.sha };
}

export async function uploadFiles(
  token: string,
  owner: string,
  repo: string,
  files: FileUpload[],
  message: string,
  branch: string,
  onProgress?: (done: number, total: number, current: string) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file.path);
    try {
      const { sha } = await uploadFile(token, owner, repo, file.path, file.content, message, branch);
      results.push({ path: file.path, success: true, sha });
    } catch (e: unknown) {
      results.push({ path: file.path, success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  onProgress?.(files.length, files.length, '');
  return results;
}
