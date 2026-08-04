import bcrypt from 'bcrypt';

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

interface HashingService {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

class BcryptService implements HashingService {
  private static instance: BcryptService;

  private constructor() {}

  public static getInstance(): BcryptService {
    if (!BcryptService.instance) {
      BcryptService.instance = new BcryptService();
    }
    return BcryptService.instance;
  }

  async hash(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
      return bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Hashing failed');
    }
  }

  async compare(password: string, hash: string): Promise<boolean> {
    try {
      return bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }
}

export { BcryptService };
export type { HashingService };