export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function resolvePagination(input: PaginationInput, maxPageSize = 100): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = Math.min(maxPageSize, Math.max(1, Math.trunc(input.pageSize ?? 20)));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function pageOf<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
