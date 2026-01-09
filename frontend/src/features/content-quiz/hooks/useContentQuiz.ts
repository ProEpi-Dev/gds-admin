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

export function useContentQuiz(id: number | null) {
  return useQuery({
    queryKey: ['content-quiz', id],
    queryFn: () => (id ? contentQuizService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateContentQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContentQuizDto) =>
      contentQuizService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-quiz'] });
    },
  });
}

export function useUpdateContentQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateContentQuizDto }) =>
      contentQuizService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['content-quiz'] });
      queryClient.invalidateQueries({ queryKey: ['content-quiz', variables.id] });
    },
  });
}

export function useDeleteContentQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => contentQuizService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-quiz'] });
    },
  });
}

