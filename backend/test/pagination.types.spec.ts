import {
  buildPaginatedResponse,
  buildPaginationMeta,
} from '../src/shared/types/pagination.types';

describe('pagination helpers', () => {
  it('standardizes empty list metadata with a minimum single page', () => {
    expect(buildPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });
  });

  it('builds the shared paginated response shape', () => {
    expect(buildPaginatedResponse(['a', 'b'], 21, 2, 10)).toEqual({
      items: ['a', 'b'],
      pagination: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    });
  });
});
