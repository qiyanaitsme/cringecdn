import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BcryptService } from '../src/utils/bcrypt.service';
import { CryptoPasswordGenerator } from '../src/utils/password-generator';
import { JwtService } from '../src/utils/jwt.service';

describe('BcryptService', () => {
  let bcryptService: BcryptService;

  beforeEach(() => {
    bcryptService = BcryptService.getInstance();
  });

  it('should hash a password', async () => {
    const password = 'TestPassword123!';
    const hash = await bcryptService.hash(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should verify a correct password', async () => {
    const password = 'TestPassword123!';
    const hash = await bcryptService.hash(password);
    const isValid = await bcryptService.verify(password, hash);
    
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'TestPassword123!';
    const wrongPassword = 'WrongPassword123!';
    const hash = await bcryptService.hash(password);
    const isValid = await bcryptService.verify(wrongPassword, hash);
    
    expect(isValid).toBe(false);
  });
});

describe('CryptoPasswordGenerator', () => {
  let generator: CryptoPasswordGenerator;

  beforeEach(() => {
    generator = CryptoPasswordGenerator.getInstance();
  });

  it('should generate a password of specified length', () => {
    const password = generator.generate(16);
    
    expect(password).toBeDefined();
    expect(password.length).toBe(16);
  });

  it('should generate different passwords on each call', () => {
    const password1 = generator.generate(12);
    const password2 = generator.generate(12);
    
    expect(password1).not.toBe(password2);
  });

  it('should only contain allowed characters', () => {
    const password = generator.generate(50);
    const allowedChars = /^[a-zA-Z0-9!@#$%^&*()_+\-=]+$/;
    
    expect(password).toMatch(allowedChars);
  });

  it('should generate passwords with default length when not specified', () => {
    const password = generator.generate();
    
    expect(password.length).toBe(16);
  });
});

describe('JwtService', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    // Create a new instance for testing
    vi.resetModules();
    jwtService = JwtService.getInstance();
  });

  it('should generate access and refresh tokens', () => {
    const userId = 1;
    const username = 'testuser';
    const role = 'USER';
    
    const tokens = jwtService.generateTokens(userId, username, role);
    
    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
    expect(tokens.accessToken.length).toBeGreaterThan(0);
    expect(tokens.refreshToken.length).toBeGreaterThan(0);
  });

  it('should verify a valid access token', () => {
    const userId = 1;
    const username = 'testuser';
    const role = 'USER';
    
    const { accessToken } = jwtService.generateTokens(userId, username, role);
    const payload = jwtService.verifyAccessToken(accessToken);
    
    expect(payload).toBeDefined();
    expect(payload?.userId).toBe(userId);
    expect(payload?.username).toBe(username);
    expect(payload?.role).toBe(role);
  });

  it('should verify a valid refresh token', () => {
    const userId = 1;
    const username = 'testuser';
    const role = 'USER';
    
    const { refreshToken } = jwtService.generateTokens(userId, username, role);
    const payload = jwtService.verifyRefreshToken(refreshToken);
    
    expect(payload).toBeDefined();
    expect(payload?.userId).toBe(userId);
    expect(payload?.username).toBe(username);
    expect(payload?.role).toBe(role);
  });

  it('should return null for invalid token', () => {
    const payload = jwtService.verifyAccessToken('invalid-token');
    
    expect(payload).toBeNull();
  });

  it('should return null for tampered token', () => {
    const { accessToken } = jwtService.generateTokens(1, 'testuser', 'USER');
    const tamperedToken = accessToken.slice(0, -5) + 'xxxxx';
    const payload = jwtService.verifyAccessToken(tamperedToken);
    
    expect(payload).toBeNull();
  });
});