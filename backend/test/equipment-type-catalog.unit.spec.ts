import 'reflect-metadata';

import { EquipmentType, TechnicalCatalogType } from '@prisma/client';
import { EquipmentsService } from '../src/modules/equipments/equipments.service';

describe('Equipment type catalog compatibility', () => {
  it('maps legacy catalog tags and classifies custom entries as OTHER', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({
        id: '11111111-1111-4111-8111-111111111111',
        tags: ['equipment-type', 'legacy-split'],
      })
      .mockResolvedValueOnce({
        id: '22222222-2222-4222-8222-222222222222',
        tags: [],
      });
    const service = new EquipmentsService(
      { technicalCatalog: { findFirst } } as never,
      {} as never,
    );
    const resolve = (
      service as unknown as {
        resolveClassification: (
          type: EquipmentType | undefined,
          catalogId: string,
          required: boolean,
        ) => Promise<{ type: EquipmentType; catalogId: string | null }>;
      }
    ).resolveClassification.bind(service);

    await expect(
      resolve(undefined, '11111111-1111-4111-8111-111111111111', true),
    ).resolves.toEqual({
      type: EquipmentType.SPLIT,
      catalogId: '11111111-1111-4111-8111-111111111111',
    });
    await expect(
      resolve(undefined, '22222222-2222-4222-8222-222222222222', true),
    ).resolves.toEqual({
      type: EquipmentType.OTHER,
      catalogId: '22222222-2222-4222-8222-222222222222',
    });
    const calls = findFirst.mock.calls as unknown[][];
    const firstArgument = calls[0]?.[0] as {
      where: { type: TechnicalCatalogType };
    };
    expect(firstArgument.where.type).toBe(TechnicalCatalogType.EQUIPMENT_TYPE);
  });
});
