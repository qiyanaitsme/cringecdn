import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32-chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-32-chars!!';
process.env.UPLOAD_PATH = './uploads';
process.env.UPLOAD_MAX_SIZE = '20971520';
process.env.UPLOAD_ALLOWED_FORMATS = 'jpg,jpeg,png,gif,webp';
process.env.DATABASE_URL = 'file:./test.db';

// Mock logger to suppress console output during tests
vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

beforeAll(() => {
  // Setup test database if needed
});

afterAll(() => {
  // Cleanup
});