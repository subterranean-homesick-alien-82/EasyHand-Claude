import { Platform } from 'react-native';

export type Category = 'tech' | 'cleaning' | 'lawncare' | 'other';
export type PostKind = 'request' | 'offer';
export type PostStatus = 'active' | 'claimed' | 'completed';

export interface PublicUser {
  id: string;
  name: string;
  neighborhood: string;
  bio: string;
  skills: string[];
  created_at: string;
}

export interface PrivateUser extends PublicUser {
  email: string;
}

export interface AuthorSummary {
  id: string;
  name: string;
  neighborhood: string;
}

export interface Post {
  id: string;
  author_id: string;
  author: AuthorSummary | null;
  kind: PostKind;
  title: string;
  description: string;
  category: Category;
  compensation: string;
  neighborhood: string;
  image_url: string | null;
  status: PostStatus;
  created_at: string;
}

export interface Message {
  id: string;
  post_id: string | null;
  sender_id: string;
  recipient_id: string;
  content: string;
  timestamp: string;
}

export interface Conversation {
  other_user: AuthorSummary;
  last_message: Message;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: PrivateUser;
}

export interface NewPost {
  kind: PostKind;
  title: string;
  description: string;
  category: Category;
  compensation?: string;
  neighborhood?: string;
  image_url?: string | null;
}

export interface ProfileUpdate {
  name?: string;
  neighborhood?: string;
  bio?: string;
  skills?: string[];
}

export interface PostFilters {
  category?: Category;
  kind?: PostKind;
  status?: PostStatus;
  neighborhood?: string;
  author_id?: string;
  q?: string;
}

interface UploadSignature {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  folder: string;
  signature: string;
  upload_url: string;
}

const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called when an authenticated request comes back 401 (e.g. the token expired). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// Plain-language names for API fields, used when the server rejects a form.
const FIELD_NAMES: Record<string, string> = {
  email: 'email address',
  password: 'password',
  name: 'name',
  neighborhood: 'neighborhood',
  title: 'title',
  description: 'details',
  compensation: 'price',
  bio: 'about you',
  content: 'message',
  image_url: 'photo',
};

function errorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    // FastAPI validation errors: [{ loc: [...], msg: "..." }]
    const first = detail[0] as { loc?: unknown[]; msg?: string };
    const field = first.loc?.[first.loc.length - 1];
    const name = typeof field === 'string' ? (FIELD_NAMES[field] ?? field) : null;
    if (name === 'email address') return 'Please check your email address. It should look like name@example.com.';
    return name ? `Please check the ${name}. (${first.msg ?? 'invalid'})` : (first.msg ?? fallback);
  }
  return fallback;
}

async function request<T>(method: string, path: string, body?: unknown, query?: object): Promise<T> {
  let url = `${API_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "We couldn't connect to EasyHand. Please check your internet connection and try again.");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(res.status, errorMessage(data, 'Something went wrong on our end. Please try again in a moment.'));
  }
  return data as T;
}

export const api = {
  register: (data: { email: string; password: string; name: string; neighborhood: string }) =>
    request<AuthResponse>('POST', '/auth/register', data),
  login: (email: string, password: string) => request<AuthResponse>('POST', '/auth/login', { email, password }),
  me: () => request<PrivateUser>('GET', '/auth/me'),

  getUser: (id: string) => request<PublicUser>('GET', `/users/${id}`),
  updateProfile: (data: ProfileUpdate) => request<PrivateUser>('PUT', '/users/profile', data),

  listPosts: (filters: PostFilters = {}) => request<Post[]>('GET', '/posts', undefined, filters),
  getPost: (id: string) => request<Post>('GET', `/posts/${id}`),
  createPost: (data: NewPost) => request<Post>('POST', '/posts', data),
  updatePostStatus: (id: string, status: PostStatus) => request<Post>('PATCH', `/posts/${id}/status`, { status }),
  deletePost: (id: string) => request<void>('DELETE', `/posts/${id}`),

  listConversations: () => request<Conversation[]>('GET', '/messages'),
  getThread: (userId: string) => request<Message[]>('GET', `/messages/${userId}`),
  sendMessage: (data: { recipient_id: string; content: string; post_id?: string }) =>
    request<Message>('POST', '/messages', data),

  /** Upload a local image (from expo-image-picker) to Cloudinary via a server-signed request. */
  async uploadImage(localUri: string, mimeType = 'image/jpeg'): Promise<string> {
    const sig = await request<UploadSignature>('POST', '/uploads/signature');
    const form = new FormData();
    if (Platform.OS === 'web') {
      form.append('file', await (await fetch(localUri)).blob());
    } else {
      // React Native's FormData accepts { uri, name, type } file descriptors.
      form.append('file', { uri: localUri, name: 'upload.jpg', type: mimeType } as unknown as Blob);
    }
    form.append('api_key', sig.api_key);
    form.append('timestamp', String(sig.timestamp));
    form.append('folder', sig.folder);
    form.append('signature', sig.signature);
    const res = await fetch(sig.upload_url, { method: 'POST', body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.secure_url) {
      throw new ApiError(res.status, data?.error?.message ?? 'Image upload failed');
    }
    return data.secure_url as string;
  },
};
