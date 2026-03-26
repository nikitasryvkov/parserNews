export function getTotalPages(total: number, limit: number): number {
  return Math.max(1, Math.ceil((total || 0) / Math.max(limit, 1)) || 1);
}

export function getPaginationPages(page: number, totalPages: number): Array<number | string> {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | string> = [1];
  let left = Math.max(2, page - 2);
  let right = Math.min(totalPages - 1, page + 2);

  if (page <= 4) {
    left = 2;
    right = Math.min(5, totalPages - 1);
  }

  if (page >= totalPages - 3) {
    left = Math.max(2, totalPages - 4);
    right = totalPages - 1;
  }

  if (left > 2) pages.push('gap-left');

  for (let current = left; current <= right; current += 1) {
    pages.push(current);
  }

  if (right < totalPages - 1) pages.push('gap-right');

  pages.push(totalPages);

  return pages;
}
