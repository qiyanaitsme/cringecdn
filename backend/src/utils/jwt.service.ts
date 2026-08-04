import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
  username: string;
  role: 'ADMIN' | 'MODERATOR' | 'USER';
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class JwtService {
  private static instance: JwtService;
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly expiresInRemember: string;

  private constructor() {
    this.secret = process.env.JWT_SECRET || 'default-secret-key';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.expiresInLong = process.env.JWT_EXPIRES_IN_REMEMBER || '30d';
  }

  public static getInstance(): JwtService {
    if (!JwtService.instance) {
      JwtService.instance = new JwtService();
    }
    return JwtService.instance;
  }

  sign(payload: JwtPayload, rememberMe = false): TokenPair {
    const expiresIn = rememberMe ? this.expiresInLong : this.expiresIn;

    const accessToken = jwt.sign(payload, this.secret, { expiresIn });

    const refreshToken = jwt.sign(
      { userId: payload.userId, type: 'refresh' },
      this.secret,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  }

  verify(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as JwtPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  verifyRefresh(token: string): { userId: number } | null {
    try {
      return jwt.verify(token, this.secret) as { userId: number };
    } catch {
      return null;
    }
  }
}

export { JwtService };
export type { JwtPayload };