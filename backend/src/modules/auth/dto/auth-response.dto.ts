import type { Role } from '@prisma/client';

export class TokenPairResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}

export class LogoutResponseDto {
  revoked!: boolean;
}

export class MeResponseDto {
  id!: string;
  email!: string;
  username!: string;
  name!: string;
  role!: Role;
  isActive!: boolean;
}
