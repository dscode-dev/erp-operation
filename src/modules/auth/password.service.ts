import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { ARGON2_OPTIONS } from '../../infra/security/argon2.constants';

@Injectable()
export class PasswordService {
  private readonly dummyHash = argon2.hash(randomBytes(32).toString('base64url'), ARGON2_OPTIONS);

  hash(value: string): Promise<string> {
    return argon2.hash(value, ARGON2_OPTIONS);
  }

  async verify(hash: string, value: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, value, ARGON2_OPTIONS);
    } catch {
      return false;
    }
  }

  async verifyPassword(hash: string | null, candidate: string): Promise<boolean> {
    return this.verify(hash ?? (await this.dummyHash), candidate);
  }
}
