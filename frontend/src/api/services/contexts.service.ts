import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type {
  CreateContextDto,
  UpdateContextDto,
  ContextQuery,
  Context,
} from "../../types/context.types";
import type { ListResponse } from "../../types/api.types";

const MAX_PAGE_SIZE = 100;

export const contextsService = {
  /** Lista contextos públicos para signup (não requer autenticação). */
  async findPublicForSignup(): Promise<ListResponse<Context>> {
    const response = await apiClient.get(API_ENDPOINTS.CONTEXTS.PUBLIC_LIST);
    return response.data;
  },

  /** Lista contextos com paginação (requer autenticação admin). */
  async findAll(query?: ContextQuery): Promise<ListResponse<Context>> {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", query.page.toString());
    if (query?.pageSize) params.append("pageSize", query.pageSize.toString());
    if (query?.active !== undefined)
      params.append("active", query.active.toString());
    if (query?.locationId)
      params.append("locationId", query.locationId.toString());
    if (query?.accessType) params.append("accessType", query.accessType);

    const response = await apiClient.get(
      `${API_ENDPOINTS.CONTEXTS.LIST_ADMIN}?${params.toString()}`
    );
    return response.data;
  },

  /** Todas as páginas concatenadas (admin / listagens que precisam do conjunto completo). */
  async findAllAllPages(
    query?: Omit<ContextQuery, "page" | "pageSize">,
  ): Promise<Context[]> {
    const pageSize = MAX_PAGE_SIZE;
    const merged: Context[] = [];
    let page = 1;
    const maxPages = 200;

    while (page <= maxPages) {
      const res = await this.findAll({ ...query, page, pageSize });
      merged.push(...res.data);
      if (res.data.length < pageSize) break;
      page += 1;
    }

    return merged;
  },

  async findOne(id: number): Promise<Context> {
    const response = await apiClient.get(API_ENDPOINTS.CONTEXTS.DETAIL(id));
    return response.data;
  },

  async create(data: CreateContextDto): Promise<Context> {
    const response = await apiClient.post(API_ENDPOINTS.CONTEXTS.CREATE, data);
    return response.data;
  },

  async update(id: number, data: UpdateContextDto): Promise<Context> {
    const response = await apiClient.patch(
      API_ENDPOINTS.CONTEXTS.UPDATE(id),
      data
    );
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CONTEXTS.DELETE(id));
  },
};
