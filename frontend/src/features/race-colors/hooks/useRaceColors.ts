import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { raceColorsService } from "../../../api/services/race-colors.service";
import type {
  CreateRaceColorDto,
  RaceColorQuery,
  UpdateRaceColorDto,
} from "../../../types/race-color.types";

export function useRaceColors(query?: RaceColorQuery) {
  return useQuery({
    queryKey: ["race-colors", query],
    queryFn: () => raceColorsService.findAll(query),
  });
}

export function useRaceColor(id: number | null) {
  return useQuery({
    queryKey: ["race-colors", id],
    queryFn: () => (id ? raceColorsService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateRaceColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRaceColorDto) => raceColorsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["race-colors"] });
    },
  });
}

export function useUpdateRaceColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRaceColorDto }) =>
      raceColorsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["race-colors"] });
      queryClient.invalidateQueries({
        queryKey: ["race-colors", variables.id],
      });
    },
  });
}

export function useDeleteRaceColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => raceColorsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["race-colors"] });
    },
  });
}
