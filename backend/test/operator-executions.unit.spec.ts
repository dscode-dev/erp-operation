import 'reflect-metadata';
import { Role } from '@prisma/client';
import { OperatorExecutionView } from '../src/modules/operations/dto/operator-execution.dto';
import { OperatorExecutionsController } from '../src/modules/operations/operator-executions.controller';
import { OperatorExecutionsService } from '../src/modules/operations/operator-executions.service';
import { ROLES_KEY } from '../src/shared/constants/auth.constants';

describe('Operator executions read model', () => {
  it('is restricted to management roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, OperatorExecutionsController)).toEqual([
      Role.OWNER,
      Role.MANAGER,
    ]);
  });

  it('builds the agenda from the official assignment owner and selected month', async () => {
    const operation = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const prisma = {
      organizationSettings: {
        findFirst: jest.fn().mockResolvedValue({ timezone: 'America/Recife' }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: '5c4370c9-7608-451e-a38e-cfbfbc695128',
          name: 'Operador',
          role: Role.OPERATOR,
        }),
      },
      operation,
      $transaction: jest.fn((queries: Array<Promise<unknown>>) => Promise.all(queries)),
    };
    const service = new OperatorExecutionsService(prisma as never);

    await service.operations(
      '5c4370c9-7608-451e-a38e-cfbfbc695128',
      {
        month: '2026-07',
        page: 1,
        limit: 20,
        view: OperatorExecutionView.AGENDA,
      },
    );

    expect(operation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignment: { assignedTo: '5c4370c9-7608-451e-a38e-cfbfbc695128' },
          scheduledFor: {
            gte: new Date('2026-07-01T03:00:00.000Z'),
            lt: new Date('2026-08-01T03:00:00.000Z'),
          },
        }) as unknown,
      }),
    );
  });
});
