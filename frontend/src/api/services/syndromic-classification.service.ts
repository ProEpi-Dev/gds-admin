import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type {
  CreateSyndromeDto,
  CreateSyndromeFormConfigDto,
  UpdateSyndromeFormConfigDto,
  CreateSymptomDto,
  DailySyndromeCountsQuery,
  DailySyndromeCountsResponse,
  ReprocessSyndromicDto,
  ReprocessSyndromicResponse,
  ReportSyndromeScoreItem,
  ReportSyndromeScoresQuery,
  Syndrome,
  SyndromeFormConfig,
  SyndromeWeightMatrix,
  Symptom,
  UpdateSyndromeDto,
  UpdateSymptomDto,
  UpsertSyndromeWeightMatrixDto,
  UpsertSyndromeWeightMatrixResponse,
} from "../../types/syndromic.types";
import type { ListResponse } from "../../types/api.types";

export const syndromicClassificationService = {
  async listSymptoms(): Promise<Symptom[]> {
    const response = await apiClient.get(API_ENDPOINTS.SYNDROMIC.SYMPTOMS);
    return response.data;
  },

  async createSymptom(data: CreateSymptomDto): Promise<Symptom> {
    const response = await apiClient.post(API_ENDPOINTS.SYNDROMIC.SYMPTOMS, data);
    return response.data;
  },

  async updateSymptom(id: number, data: UpdateSymptomDto): Promise<Symptom> {
    const response = await apiClient.patch(
      API_ENDPOINTS.SYNDROMIC.SYMPTOM_DETAIL(id),
      data,
    );
    return response.data;
  },

  async removeSymptom(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.SYNDROMIC.SYMPTOM_DETAIL(id));
  },

  async listSyndromes(): Promise<Syndrome[]> {
    const response = await apiClient.get(API_ENDPOINTS.SYNDROMIC.SYNDROMES);
    return response.data;
  },

  async createSyndrome(data: CreateSyndromeDto): Promise<Syndrome> {
    const response = await apiClient.post(
      API_ENDPOINTS.SYNDROMIC.SYNDROMES,
      data,
    );
    return response.data;
  },

  async updateSyndrome(id: number, data: UpdateSyndromeDto): Promise<Syndrome> {
    const response = await apiClient.patch(
      API_ENDPOINTS.SYNDROMIC.SYNDROME_DETAIL(id),
      data,
    );
    return response.data;
  },

  async removeSyndrome(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.SYNDROMIC.SYNDROME_DETAIL(id));
  },

  async getWeightMatrix(): Promise<SyndromeWeightMatrix> {
    const response = await apiClient.get(API_ENDPOINTS.SYNDROMIC.WEIGHTS_MATRIX);
    return response.data;
  },

  async upsertWeightMatrix(
    dto: UpsertSyndromeWeightMatrixDto,
  ): Promise<UpsertSyndromeWeightMatrixResponse> {
    const response = await apiClient.put(
      API_ENDPOINTS.SYNDROMIC.WEIGHTS_MATRIX,
      dto,
    );
    return response.data;
  },

  async getDailySyndromeCounts(
    query: DailySyndromeCountsQuery,
  ): Promise<DailySyndromeCountsResponse> {
    const params = new URLSearchParams();
    params.append("startDate", query.startDate);
    params.append("endDate", query.endDate);
    if (query.contextId !== undefined) {
      params.append("contextId", query.contextId.toString());
    }
    if (query.onlyAboveThreshold !== undefined) {
      params.append("onlyAboveThreshold", query.onlyAboveThreshold.toString());
    }
    if (query.syndromeIds && query.syndromeIds.length > 0) {
      query.syndromeIds.forEach((id) => params.append("syndromeIds", String(id)));
    }

    const response = await apiClient.get(
      `${API_ENDPOINTS.SYNDROMIC.DAILY_REPORT}?${params.toString()}`,
    );
    return response.data;
  },

  async listReportScores(
    query?: ReportSyndromeScoresQuery,
  ): Promise<ListResponse<ReportSyndromeScoreItem>> {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", String(query.page));
    if (query?.pageSize) params.append("pageSize", String(query.pageSize));
    if (query?.contextId !== undefined) params.append("contextId", String(query.contextId));
    if (query?.reportId !== undefined) params.append("reportId", String(query.reportId));
    if (query?.syndromeId !== undefined) params.append("syndromeId", String(query.syndromeId));
    if (query?.startDate) params.append("startDate", query.startDate);
    if (query?.endDate) params.append("endDate", query.endDate);
    if (query?.processingStatus) params.append("processingStatus", query.processingStatus);
    if (query?.isAboveThreshold !== undefined) {
      params.append("isAboveThreshold", String(query.isAboveThreshold));
    }
    if (query?.onlyLatest !== undefined) params.append("onlyLatest", String(query.onlyLatest));

    const url = params.toString()
      ? `${API_ENDPOINTS.SYNDROMIC.SCORES_REPORT}?${params.toString()}`
      : API_ENDPOINTS.SYNDROMIC.SCORES_REPORT;
    const response = await apiClient.get(url);
    return response.data;
  },

  async reprocess(
    data: ReprocessSyndromicDto,
  ): Promise<ReprocessSyndromicResponse> {
    const response = await apiClient.post(API_ENDPOINTS.SYNDROMIC.REPROCESS, data);
    return response.data;
  },

  async listFormConfigs(): Promise<SyndromeFormConfig[]> {
    const response = await apiClient.get(API_ENDPOINTS.SYNDROMIC.FORM_CONFIGS);
    return response.data;
  },

  async createFormConfig(
    data: CreateSyndromeFormConfigDto,
  ): Promise<SyndromeFormConfig> {
    const response = await apiClient.post(
      API_ENDPOINTS.SYNDROMIC.FORM_CONFIGS,
      data,
    );
    return response.data;
  },

  async updateFormConfig(
    id: number,
    data: UpdateSyndromeFormConfigDto,
  ): Promise<SyndromeFormConfig> {
    const response = await apiClient.patch(
      API_ENDPOINTS.SYNDROMIC.FORM_CONFIG_DETAIL(id),
      data,
    );
    return response.data;
  },

  async removeFormConfig(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.SYNDROMIC.FORM_CONFIG_DETAIL(id));
  },
};
