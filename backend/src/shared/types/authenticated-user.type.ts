import type { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
}
