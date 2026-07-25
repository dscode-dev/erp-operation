import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants/auth.constants';

/** Flags de `UserPermission` que gatam o acesso de operadores a uma rota. */
export type OperatorPermissionFlag =
  | 'canFinancial'
  | 'canUsers'
  | 'canReports'
  | 'canSchedules'
  | 'canTemplates';

/**
 * Exige uma ou mais permissões (`UserPermission`) para operadores acessarem a
 * rota. Só afeta o papel OPERATOR — Owner/Manager têm acesso pleno. Use junto de
 * `@Roles(...)`. Ex.: iniciar/gerar atendimentos exige `canReports`.
 */
export const RequirePermission = (
  ...permissions: OperatorPermissionFlag[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);
