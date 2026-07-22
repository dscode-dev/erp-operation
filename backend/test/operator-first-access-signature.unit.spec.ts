import { UsersService } from '../src/modules/users/users.service';

describe('Operator first access signature', () => {
  it('changes the temporary password and persists the official user signature atomically', async () => {
    const tx = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: 'organization-id' }) },
      signature: { upsert: jest.fn().mockResolvedValue({ id: 'signature-id' }) },
      user: { update: jest.fn().mockResolvedValue({ id: 'user-id' }) },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-id',
          name: 'Operador Orbit',
          jobTitle: 'Técnico',
          passwordHash: 'temporary-hash',
          mustChangePassword: true,
          institutionalSignature: null,
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const passwords = {
      verifyPassword: jest.fn().mockResolvedValue(true),
      verify: jest.fn().mockResolvedValue(false),
      hash: jest.fn().mockResolvedValue('definitive-hash'),
    };
    const signatures = {
      stageUserSignatureImage: jest.fn().mockResolvedValue({
        storageKey: 'documents/signatures/random.png',
        mimeType: 'image/png',
        originalFileName: 'assinatura.png',
        fileSize: 128,
      }),
      discardStagedImage: jest.fn().mockResolvedValue(undefined),
    };
    const service = new UsersService(
      prisma as never,
      passwords as never,
      {} as never,
      signatures as never,
    );

    const result = await service.completeFirstAccess(
      'user-id',
      {
        currentPassword: 'temporary-password',
        newPassword: 'a-strong-definitive-password',
        signatureTitle: 'Técnico de Campo',
        professionalCouncil: 'CFT',
        registrationNumber: '12345',
      },
      { buffer: Buffer.from('png'), mimetype: 'image/png', originalname: 'assinatura.png', size: 128 },
      { requestId: 'request-id', ip: '127.0.0.1', userAgent: 'jest' },
    );

    expect(result).toEqual({ completed: true, signatureId: 'signature-id', reauthenticationRequired: true });
    expect(tx.signature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-id' },
        create: expect.objectContaining({
          userId: 'user-id',
          name: 'Operador Orbit',
          active: true,
        }) as unknown,
      }),
    );
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { passwordHash: 'definitive-hash', mustChangePassword: false },
    });
    expect(tx.auditLog.createMany).toHaveBeenCalled();
  });
});
