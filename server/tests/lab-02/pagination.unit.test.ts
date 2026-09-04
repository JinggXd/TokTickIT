import { describe, it, expect } from "vitest";
import { clampPagination } from "../../src/utils/pagination.js";

describe("Pagination Helper Unit Tests (BR-12)", () => {
  it("UNIT-06: clamps out-of-range page numbers and validates allowed limit sizes", () => {
    // 1. page = 0 clamped to 1
    const zeroPage = clampPagination({ page: 0, limit: 8, totalItems: 25 });
    expect(zeroPage.isValid).toBe(true);
    expect(zeroPage.pagination.currentPage).toBe(1);
    expect(zeroPage.pagination.pageSize).toBe(8);
    expect(zeroPage.pagination.totalPages).toBe(4);
    expect(zeroPage.skip).toBe(0);
    expect(zeroPage.take).toBe(8);

    // 2. page = 999 with totalPages = 5 clamped to 5
    const largePage = clampPagination({ page: 999, limit: 10, totalItems: 50 });
    expect(largePage.isValid).toBe(true);
    expect(largePage.pagination.currentPage).toBe(5);
    expect(largePage.pagination.totalPages).toBe(5);
    expect(largePage.skip).toBe(40);
    expect(largePage.take).toBe(10);

    // 3. Negative page clamped to 1
    const negPage = clampPagination({ page: -5, limit: 8, totalItems: 10 });
    expect(negPage.isValid).toBe(true);
    expect(negPage.pagination.currentPage).toBe(1);

    // 4. Zero total items -> totalPages is 1, currentPage is 1
    const emptyResult = clampPagination({ page: 1, limit: 8, totalItems: 0 });
    expect(emptyResult.isValid).toBe(true);
    expect(emptyResult.pagination.currentPage).toBe(1);
    expect(emptyResult.pagination.totalPages).toBe(1);
    expect(emptyResult.pagination.totalItems).toBe(0);

    // 5. Unsupported limit (e.g. limit = 7) returns validation error
    const invalidLimit = clampPagination({ page: 1, limit: 7, totalItems: 50 });
    expect(invalidLimit.isValid).toBe(false);
    expect(invalidLimit.error).toBe("limit must be one of 5, 8, 10, 20");

    // 6. Valid limits (5, 8, 10, 20) are accepted
    for (const validLimit of [5, 8, 10, 20]) {
      const res = clampPagination({ page: 1, limit: validLimit, totalItems: 100 });
      expect(res.isValid).toBe(true);
      expect(res.pagination.pageSize).toBe(validLimit);
    }

    // 7. Float page truncated to integer
    const floatPage = clampPagination({ page: 2.7, limit: 8, totalItems: 25 });
    expect(floatPage.isValid).toBe(true);
    expect(floatPage.pagination.currentPage).toBe(2);
  });
});
