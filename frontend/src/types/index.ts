export interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'MODERATOR' | 'USER';
  avatar?: string | null;
  groupName?: string | null;
  totalUploads: number;
  isBlocked: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface Image {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  thumbnailUrl?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  url: string;
  thumbnailUrl?: string | null;
  directUrl?: string;
  html?: string;
  bbcode?: string;
  markdown?: string;
}

export interface Album {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
  actor?: User | null;
}

export interface BlockedIp {
  id: string;
  ipAddress: string;
  reason: string;
  blockedBy: string;
  createdAt: string;
  expiresAt?: string | null;
}

export interface StatsData {
  totalUsers: number;
  totalImages: number;
  totalAlbums: number;
  blockedUsers: number;
  blockedIps: number;
  recentUploads: number;
  totalStorageBytes: number;
  totalStorageMB: number;
}