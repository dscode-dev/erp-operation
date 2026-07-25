import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../../../shared/constants/auth.constants';
import { ERROR_CODES } from '../../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../../shared/exceptions/application.exception';
import type { OperatorPermissionFlag } from '../../../shared/decorators/require-permission.decorator';
import type { RequestWithId } from '../../../shared/types/request-with-id.type';
import { PrismaService } from '../../database/prisma.service';

/**
 * Aplica as permissões granulares de `UserPermission` — mas somente ao papel
 * OPERATOR. Owner/Manager têm acesso pleno e ignoram estas flags. Ex.: rotas de
 * iniciar/gerar atendimento exigem `canReports`; um operador só com agendamentos
 * (canSchedules) fica restrito à visualização.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<OperatorPermissionFlag[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<RequestWithId>().user;
    // Permissões granulares só restringem operadores; gestão tem acesso pleno.
    if (!user || user.role !== Role.OPERATOR) return true;

    const permission = await this.prisma.userPermission.findUnique({
      where: { userId: user.id },
      select: {
        canFinancial: true,
        canUsers: true,
        canReports: true,
        canSchedules: true,
        canTemplates: true,
      },
    });
    const granted = required.every((flag) => permission?.[flag] === true);
    if (!granted) {
      throw new ApplicationException(
        ERROR_CODES.FORBIDDEN,
        'Seu perfil não tem permissão para esta ação.',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
