import 'reflect-metadata';

import { Role } from '@prisma/client';
import { AssignmentsService } from '../src/modules/assignments/assignments.service';

describe('RVT auxiliary assignments', () => {
  it('creates an authorized secondary Assignment without replacing the primary executor', async () => {
    const transaction = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: '22222222-2222-4222-8222-222222222222',
          role: Role.OPERATOR,
          isActive: true,
          disabledAt: null,
        }),
      },
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AssignmentsService({} as never, {} as never, {} as never, {} as never);
    const create = jest.spyOn(service, 'createForOperationTx').mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
    });

    await service.syncAuxiliaryAssignmentsTx(
      transaction as never,
      '44444444-4444-4444-8444-444444444444',
      '11111111-1111-4111-8111-111111111111',
      ['22222222-2222-4222-8222-222222222222'],
      '55555555-5555-4555-8555-555555555555',
      { requestId: 'auxiliary-test', ip: null, userAgent: null },
    );

    expect(create).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        assignedTo: '22222222-2222-4222-8222-222222222222',
        isPrimary: false,
        operatorVisible: true,
      }),
      '55555555-5555-4555-8555-555555555555',
      expect.objectContaining({ requestId: 'auxiliary-test' }),
    );
  });
});
