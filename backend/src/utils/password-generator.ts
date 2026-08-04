import crypto from 'crypto';

interface TemporaryPasswordGenerator {
  generate(length?: number): string;
}

class CryptoPasswordGenerator implements TemporaryPasswordGenerator {
  private static instance: CryptoPasswordGenerator;
  private readonly defaultLength = 12;
  private readonly charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';

  private constructor() {}

  public static getInstance(): CryptoPasswordGenerator {
    if (!CryptoPasswordGenerator.instance) {
      CryptoPasswordGenerator.instance = new CryptoPasswordGenerator();
    }
    return CryptoPasswordGenerator.instance;
  }

  generate(length: number = this.defaultLength): string {
    const bytes = crypto.randomBytes(length);
    const result: string[] = [];

    for (let i = 0; i < length; i += 1) {
      result.push(this.charset[bytes[i] % this.charset.length]);
    }

    // Ensure password complexity: at least one uppercase, one digit, one special
    const hasUpper = /[A-Z]/.test(result.join(''));
    const hasDigit = /\d/.test(result.join(''));
    const hasSpecial = /[!@#$%^&*()_+=]/.test(result.join(''));

    if (!hasUpper) result[0] = 'A';
    if (!hasDigit) result[1] = '1';
    if (!hasSpecial) result[2] = '!';

    return result.join('');
  }
}

export { CryptoPasswordGenerator };
export type { TemporaryPasswordGenerator };