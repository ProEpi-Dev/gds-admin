import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesService } from "../../../api/services/roles.service";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesService.findAll(),
  });
}

export function useParticipationRoles(participationId: number | null) {
  return useQuery({
    queryKey: ["participation-roles", participationId],
    queryFn: () => rolesService.findParticipationRoles(participationId!),
    enabled: participationId !== null,
  });
}

export function useAddParticipationRole(participationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: number) =>
      rolesService.addParticipationRole(participationId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["participation-roles", participationId],
      });
    },
  });
}

export function useRemoveParticipationRole(participationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: number) =>
      rolesService.removeParticipationRole(participationId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["participation-roles", participationId],
      });
    },
  });
}
