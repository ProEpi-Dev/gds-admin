export interface Symptom {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
}

export interface Syndrome {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  threshold_score: number;
  active: boolean;
}

export interface CreateSymptomDto {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateSymptomDto {
  code?: string;
  name?: string;
  description?: string;
  active?: boolean;
}

export interface CreateSyndromeDto {
  code: string;
  name: string;
  description?: string;
  thresholdScore?: number;
}

export interface UpdateSyndromeDto {
  code?: string;
  name?: string;
  description?: string;
  thresholdScore?: number;
  active?: boolean;
}

export interface SyndromeWeightMatrix {
  syndromes: Array<{
    id: number;
    code: string;
    name: string;
    threshold_score: number;
  }>;
  symptoms: Array<{
    id: number;
    code: string;
    name: string;
  }>;
  cells: Array<{
    id: number;
    syndromeId: number;
    symptomId: number;
    weight: number;
    updatedAt: string;
  }>;
  generatedAt: string;
}

export interface SyndromeWeightMatrixCellUpsert {
  syndromeId: number;
  symptomId: number;
  weight: number;
}

export interface UpsertSyndromeWeightMatrixDto {
  cells: SyndromeWeightMatrixCellUpsert[];
}

export interface UpsertSyndromeWeightMatrixResponse {
  updatedCount: number;
}

export interface DailySyndromeCountsQuery {
  startDate: string;
  endDate: string;
  contextId?: number;
  syndromeIds?: number[];
  onlyAboveThreshold?: boolean;
}

export interface DailySyndromeCountsResponse {
  labels: string[];
  series: Array<{
    syndromeId: number;
    syndromeName: string;
    values: number[];
  }>;
  totalsBySyndrome: Array<{
    syndromeId: number;
    syndromeName: string;
    total: number;
  }>;
}

export interface ReportSyndromeScoreItem {
  id: number;
  reportId: number;
  occurrenceLocation: { latitude: number; longitude: number } | null;
  syndromeId: number | null;
  syndromeCode: string | null;
  syndromeName: string | null;
  score: number | null;
  thresholdScore: number | null;
  isAboveThreshold: boolean | null;
  processingStatus: "processed" | "skipped" | "failed";
  processingError: string | null;
  processedAt: string;
}

export interface ReportSyndromeScoresQuery {
  page?: number;
  pageSize?: number;
  contextId?: number;
  reportId?: number;
  syndromeId?: number;
  startDate?: string;
  endDate?: string;
  processingStatus?: "processed" | "skipped" | "failed";
  /** Quando definido, filtra linhas com `is_above_threshold` igual ao valor. */
  isAboveThreshold?: boolean;
  onlyLatest?: boolean;
}

export interface ReprocessSyndromicDto {
  reportIds?: number[];
  /** Filtra reports deste formulário (todas as versões). */
  formId?: number;
  /** @deprecated Preferir formId */
  formVersionId?: number;
  startDate?: string;
  endDate?: string;
  /** Restringe a reports do contexto (recomendado no reprocessamento por período). */
  contextId?: number;
  onlyLatestActive?: boolean;
  limit?: number;
  cursor?: number;
}

export interface ReprocessSyndromicResponse {
  jobLikeId: string;
  requestedCount: number;
  processedCount: number;
  skippedCount: number;
  failedCount: number;
  nextCursor: number | null;
}

/** Resposta do Prisma (snake_case) para `syndrome_form_config`. */
export interface SyndromeFormConfig {
  id: number;
  form_id: number;
  symptoms_field_name: string | null;
  symptoms_field_id: string | null;
  symptom_onset_date_field_name: string | null;
  symptom_onset_date_field_id: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  form?: {
    id: number;
    title: string;
    reference: string | null;
    active: boolean;
  };
}

export interface CreateSyndromeFormConfigDto {
  formId: number;
  /** Identificador do campo no `form_response` que guarda os sintomas (multiselect / valor bruto). */
  symptomsFieldId?: string;
  symptomsFieldName?: string;
  symptomOnsetDateFieldId?: string;
  symptomOnsetDateFieldName?: string;
  active?: boolean;
}

export interface UpdateSyndromeFormConfigDto {
  formId?: number;
  symptomsFieldId?: string;
  symptomsFieldName?: string;
  symptomOnsetDateFieldId?: string;
  symptomOnsetDateFieldName?: string;
  active?: boolean;
}

export interface BiExportApiKeyListItem {
  publicId: string;
  name: string;
  contextId: number;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

export interface CreateBiExportApiKeyDto {
  contextId: number;
  name: string;
}

export interface CreateBiExportApiKeyResponse {
  apiKey: string;
  publicId: string;
  name: string;
  contextId: number;
  createdAt: string;
}
