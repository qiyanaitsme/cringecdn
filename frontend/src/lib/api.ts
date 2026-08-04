import { AuthResponse, User, Image, AuditLog, BlockedIp, StatsData } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      throw new Error(data.message || data.error || 'API error');
    }

    return data;
  }

  // Auth endpoints
  async login(usernameOrEmail: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password, rememberMe }),
    });
  }

  async logout(): Promise<void> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async me(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // User endpoints
  async updateProfile(data: { email?: string; groupName?: string }): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Image endpoints
  async uploadImage(file: File): Promise<Image & { url: string; thumbnailUrl: string | null }> {
    const formData = new FormData();
    formData.append('image', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const response = await fetch(`${this.baseUrl}/images`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'Upload failed');
    return data.data;
  }

  async listImages(params?: { page?: number; limit?: number }): Promise<{ images: Image[], total: number }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`images?${query}`);
  }

  async getImage(id: string): Promise<Image & { directUrl: string; html: string; bbcode: string; markdown: string }> {
    return this.request(`images/${id}`);
  }

  async deleteImage(id: string): Promise<void> {
    return this.request(`images/${id}`, { method: 'DELETE' });
  }

  // Admin endpoints
  async listUsers(params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<{ users: User[], total: number }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`admin/users?${query}`);
  }

  async createUser(data: { username: string; email: string; role?: 'USER' | 'MODERATOR' | 'ADMIN'; groupName?: string }): Promise<{ user: User; temporaryPassword: string }> {
    return this.request('admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async blockUser(userId: number, reason?: string): Promise<void> {
    return this.request(`admin/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async unblockUser(userId: number): Promise<void> {
    return this.request(`admin/users/${userId}/unblock`, { method: 'POST' });
  }

  async resetUserPassword(userId: number): Promise<{ temporaryPassword: string }> {
    return this.request(`admin/users/${userId}/reset-password`, { method: 'POST' });
  }

  async listAllImages(params?: { page?: number; limit?: number }): Promise<{ images: Image[], total: number }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`admin/images?${query}`);
  }

  async deleteAnyImage(imageId: string): Promise<void> {
    return this.request(`admin/images/${imageId}`, { method: 'DELETE' });
  }

  async getAuditLogs(params?: { page?: number; limit?: number }): Promise<{ logs: AuditLog[], total: number }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`admin/audit-logs?${query}`);
  }

  async listBlockedIps(params?: { page?: number; limit?: number }): Promise<{ blockedIps: BlockedIp[], total: number }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`admin/blocked-ips?${query}`);
  }

  async blockIp(ipAddress: string, reason: string, expiresAt?: string): Promise<BlockedIp> {
    return this.request('admin/blocked-ips', {
      method: 'POST',
      body: JSON.stringify({ ipAddress, reason, expiresAt }),
    });
  }

  async unblockIp(ipAddress: string): Promise<void> {
    return this.request(`admin/blocked-ips/${encodeURIComponent(ipAddress)}`, { method: 'DELETE' });
  }

  async getStats(): Promise<StatsData> {
    return this.request('admin/stats');
  }

  async getSettings(): Promise<{ maxFileSize: number; allowedFormats: string[]; registrationEnabled: boolean }> {
    return this.request('admin/settings');
  }
}

export const api = new ApiClient();