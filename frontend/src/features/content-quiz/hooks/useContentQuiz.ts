import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentQuizService } from '../../../api/services/content-quiz.service';
import type {
  CreateContentQuizDto,
  UpdateContentQuizDto,
  ContentQuizQuery,
} from '../../../types/content-quiz.types';

export function useContentQuizzes(query?: ContentQuizQuery) {
  return useQuery({
    queryKey: ['content-quiz', query],
    queryFn: () => contentQuizService.findAll(query),
  });
}

export function useContentQuiz(id: number | null, contextId?: number) {
  return useQuery({
    queryKey: ['content-quiz', id, contextId],
    queryFn: () => (id ? contentQuizService.findOne(id, contextId) : null),
    enabled: !!id,
  });
}

export function useCreateContentQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      data: CreateContentQuizDto;
      contextId?: number;
    }) => contentQuizService.create(vars.data, vars.contextId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-quiz'] });
    },
  });
}

export function useUpdateContentQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      id: number;
      data: UpdateContentQuizDto;
      contextId?: number;
    }) => contentQuizService.update(vars.id, vars.data, vars.contextId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['content-quiz'] });
      queryClient.invalidateQueries({ queryKey: ['content-quiz', variables.id] });
    },
  });
}

export function useDeleteContentQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: number; contextId?: number }) =>
      contentQuizService.remove(vars.id, vars.contextId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-quiz'] });
    },
  });
}

