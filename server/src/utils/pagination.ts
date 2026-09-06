export const ALLOWED_PAGE_SIZES = [5, 8, 10, 20] as const;
export type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

export interface PaginationOptions {
  page?: number | string;
  limit?: number | string;
  totalItems: number;
}

export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationResult {
  isValid: boolean;
  error?: string;
  pagination: PaginationMetadata;
  skip: number;
  take: number;
}

/**
 * Clamps pagination parameters to valid ranges per BR-12.
 */
export function clampPagination(options: PaginationOptions): PaginationResult {
  const parsedLimit = options.limit !== undefined ? Number(options.limit) : 8;

  if (!ALLOWED_PAGE_SIZES.includes(parsedLimit as AllowedPageSize)) {
    return {
      isValid: false,
      error: "limit must be one of 5, 8, 10, 20",
      pagination: {
        currentPage: 1,
        pageSize: 8,
        totalItems: options.totalItems,
        totalPages: 1,
      },
      skip: 0,
      take: 8,
    };
  }

  const limit = parsedLimit as AllowedPageSize;
  const totalItems = Math.max(0, options.totalItems);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  let page = options.page !== undefined ? Math.floor(Number(options.page)) : 1;
  if (isNaN(page) || page < 1) {
    page = 1;
  } else if (page > totalPages) {
    page = totalPages;
  }

  const skip = (page - 1) * limit;
  const take = limit;

  return {
    isValid: true,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems,
      totalPages,
    },
    skip,
    take,
  };
}
