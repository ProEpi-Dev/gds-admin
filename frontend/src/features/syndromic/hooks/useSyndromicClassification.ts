import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { syndromicClassificationService } from "../../../api/services/syndromic-classification.service";
import type {
  CreateSyndromeDto,
  CreateSyndromeFormConfigDto,
  UpdateSyndromeFormConfigDto,
  CreateSymptomDto,
  DailySyndromeCountsQuery,
  ReprocessSyndromicDto,
  ReportSyndromeScoresQuery,
  UpdateSyndromeDto,
  UpdateSymptomDto,
  UpsertSyndromeWeightMatrixDto,
  CreateBiExportApiKeyDto,
} from "../../../types/syndromic.types";

export function useSyndromicSymptoms() {
  return useQuery({
    queryKey: ["syndromic", "symptoms"],
    queryFn: () => syndromicClassificationService.listSymptoms(),
  });
}

export function useCreateSyndromicSymptom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSymptomDto) =>
      syndromicClassificationService.createSymptom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "symptoms"] });
    },
  });
}

export function useUpdateSyndromicSymptom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSymptomDto }) =>
      syndromicClassificationService.updateSymptom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "symptoms"] });
    },
  });
}

export function useDeleteSyndromicSymptom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => syndromicClassificationService.removeSymptom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "symptoms"] });
    },
  });
}

export function useSyndromicSyndromes() {
  return useQuery({
    queryKey: ["syndromic", "syndromes"],
    queryFn: () => syndromicClassificationService.listSyndromes(),
  });
}

export function useCreateSyndrome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSyndromeDto) =>
      syndromicClassificationService.createSyndrome(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "syndromes"] });
    },
  });
}

export function useUpdateSyndrome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSyndromeDto }) =>
      syndromicClassificationService.updateSyndrome(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "syndromes"] });
    },
  });
}

export function useDeleteSyndrome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => syndromicClassificationService.removeSyndrome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "syndromes"] });
    },
  });
}

export function useSyndromicWeightMatrix() {
  return useQuery({
    queryKey: ["syndromic", "weights-matrix"],
    queryFn: () => syndromicClassificationService.getWeightMatrix(),
    refetchOnWindowFocus: false,
  });
}

export function useUpsertSyndromicWeightMatrix() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertSyndromeWeightMatrixDto) =>
      syndromicClassificationService.upsertWeightMatrix(dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["syndromic", "weights-matrix"] });
    },
  });
}

export function useDailySyndromeCounts(
  query: DailySyndromeCountsQuery | null,
  options?: { enabled?: boolean },
) {
  const enabled =
    !!query && (options?.enabled !== undefined ? options.enabled : true);
  return useQuery({
    queryKey: ["syndromic", "daily-report", query],
    queryFn: () => syndromicClassificationService.getDailySyndromeCounts(query!),
    enabled,
  });
}

export function useReportSyndromeScores(
  query: ReportSyndromeScoresQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["syndromic", "scores-report", query],
    queryFn: () => syndromicClassificationService.listReportScores(query),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    placeholderData: keepPreviousData,
  });
}

export function useReprocessSyndromic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReprocessSyndromicDto) =>
      syndromicClassificationService.reprocess(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "scores-report"] });
      queryClient.invalidateQueries({ queryKey: ["syndromic", "daily-report"] });
    },
  });
}

export function useSyndromicFormConfigs() {
  return useQuery({
    queryKey: ["syndromic", "form-configs"],
    queryFn: () => syndromicClassificationService.listFormConfigs(),
  });
}

export function useCreateSyndromicFormConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSyndromeFormConfigDto) =>
      syndromicClassificationService.createFormConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "form-configs"] });
    },
  });
}

export function useUpdateSyndromicFormConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateSyndromeFormConfigDto;
    }) => syndromicClassificationService.updateFormConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "form-configs"] });
    },
  });
}

export function useRemoveSyndromicFormConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      syndromicClassificationService.removeFormConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syndromic", "form-configs"] });
    },
  });
}

export function useBiExportApiKeys(contextId: number | null) {
  return useQuery({
    queryKey: ["syndromic", "bi-export-api-keys", contextId],
    queryFn: () =>
      syndromicClassificationService.listBiExportApiKeys(contextId as number),
    enabled: contextId != null && contextId > 0,
  });
}

export function useCreateBiExportApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBiExportApiKeyDto) =>
      syndromicClassificationService.createBiExportApiKey(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["syndromic", "bi-export-api-keys", variables.contextId],
      });
    },
  });
}

export function useRevokeBiExportApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId }: { publicId: string; contextId: number }) =>
      syndromicClassificationService.revokeBiExportApiKey(publicId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["syndromic", "bi-export-api-keys", variables.contextId],
      });
    },
  });
}
