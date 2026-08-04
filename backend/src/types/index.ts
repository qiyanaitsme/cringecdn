import { Request } from 'express';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'MODERATOR' | 'USER';
  avatar?: string | null;
  groupName?: string | null;
  isBlocked: boolean;
  mustChangePassword: boolean;
  totalUploads: number;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface AuditLogCreate {
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
}

export interface BlockedIpCreate {
  ipAddress: string;
  reason: string;
  blockedBy: string;
  expiresAt?: Date;
}