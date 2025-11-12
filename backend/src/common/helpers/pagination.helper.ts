import { PaginationMetaDto, PaginationLinksDto } from '../dto/pagination.dto';

export interface PaginationOptions {
  page: number;
  pageSize: number;
  totalItems: number;
  baseUrl: string;
  queryParams?: Record<string, any>;
}

export function createPaginationMeta(options: PaginationOptions): PaginationMetaDto {
  const { page, pageSize, totalItems } = options;
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
  };
}

export function createPaginationLinks(options: PaginationOptions): PaginationLinksDto {
  const { page, pageSize, totalItems, baseUrl, queryParams = {} } = options;
  const totalPages = Math.ceil(totalItems / pageSize);

  const buildUrl = (pageNum: number) => {
    const params = new URLSearchParams({
      ...queryParams,
      page: pageNum.toString(),
      pageSize: pageSize.toString(),
    });
    return `${baseUrl}?${params.toString()}`;
  };

  return {
    first: buildUrl(1),
    last: buildUrl(totalPages),
    prev: page > 1 ? buildUrl(page - 1) : null,
    next: page < totalPages ? buildUrl(page + 1) : null,
  };
}

