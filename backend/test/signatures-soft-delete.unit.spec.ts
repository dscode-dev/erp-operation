import { SignaturesService } from '../src/modules/signatures/signatures.service';

const actor = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'owner@orbit.test',
  username: 'owner',
  name: 'Owner',
  role: 'OWNER',
  isActive: true,
  mustChangePassword: false,
} as const;

const context = { requestId: 'unit-test', ip: '127.0.0.1', userAgent: 'jest' };

describe('SignaturesService soft-delete semantics', () => {
  it('normal list excludes soft-deleted signatures while allowing inactive signatures', async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([
        [{ id: 'sig-inactive', name: 'Inativa', title: 'Responsável', active: false, deletedAt: null }],
        1,
      ]),
      signature: {
        findMany: jest.fn((args: Record<string, unknown>) => ({ model: 'signature', operation: 'findMany', args })),
        count: jest.fn((args: Record<string, unknown>) => ({ model: 'signature', operation: 'count', args })),
      },
    };
    const service = new SignaturesService(prisma as never, {} as never);

    const result = await service.list({ page: 1, limit: 20 });

    expect(result).toMatchObject({
      items: [{ id: 'sig-inactive', active: false, deletedAt: null }],
      pagination: { total: 1 },
    });
    const findManyCalls = prisma.signature.findMany.mock.calls as Array<[unknown]>;
    const countCalls = prisma.signature.count.mock.calls as Array<[unknown]>;
    const findCall = findManyCalls[0]?.[0] as { where: { deletedAt: null } };
    const countCall = countCalls[0]?.[0] as { where: { deletedAt: null } };
    expect(findCall.where.deletedAt).toBeNull();
    expect(countCall.where.deletedAt).toBeNull();
  });

  it('delete marks signature as inactive and sets deletedAt', async () => {
    const signature = { id: 'sig-id', name: 'Assinatura', title: 'Técnico', active: true, deletedAt: null };
    const prisma = {
      signature: {
        findUnique: jest.fn().mockResolvedValue(signature),
        update: jest.fn().mockResolvedValue({ ...signature, active: false, deletedAt: new Date() }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit' }),
      },
      $transaction: jest.fn().mockResolvedValue([{ ...signature, active: false }, { id: 'audit' }]),
    };
    const service = new SignaturesService(prisma as never, {} as never);

    await expect(service.remove(signature.id, actor as never, context)).resolves.toEqual({ deleted: true });
    const updateCalls = prisma.signature.update.mock.calls as Array<[unknown]>;
    const updateCall = updateCalls[0]?.[0] as {
      where: { id: string };
      data: { active: boolean; deletedAt: Date };
    };
    expect(updateCall.where.id).toBe(signature.id);
    expect(updateCall.data.active).toBe(false);
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });
});
