import { UsersService } from '../src/modules/users/users.service';

const context = { requestId: 'unit-test', ip: '127.0.0.1', userAgent: 'jest' };

describe('UsersService avatar security', () => {
  it('does not expose avatar storage keys in public upload responses', async () => {
    const avatar = {
      id: '11111111-1111-4111-8111-111111111111',
      storageKey: 'users/avatar/private-key.png',
      mimeType: 'image/png',
      originalFileName: 'avatar.png',
      fileSize: 8,
      createdAt: new Date('2026-07-10T12:00:00Z'),
    };
    const tx = {
      userAvatarAsset: { create: jest.fn().mockResolvedValue(avatar) },
      user: { update: jest.fn().mockResolvedValue({ id: 'user' }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit' }) },
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ avatarAsset: null }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const storage = {
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const service = new UsersService(prisma as never, {} as never, storage as never);

    const result = await service.uploadAvatar(
      '22222222-2222-4222-8222-222222222222',
      {
        buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        mimetype: 'image/png',
        originalname: 'avatar.png',
        size: 8,
      },
      context,
    );

    expect(result).toEqual({
      id: avatar.id,
      mimeType: avatar.mimeType,
      originalFileName: avatar.originalFileName,
      fileSize: avatar.fileSize,
      createdAt: avatar.createdAt,
    });
    expect('storageKey' in result).toBe(false);
  });
});
