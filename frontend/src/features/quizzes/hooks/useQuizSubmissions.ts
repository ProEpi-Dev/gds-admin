import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizSubmissionsService } from '../../../api/services/quiz-submissions.service';
import type {
  CreateQuizSubmissionDto,
  UpdateQuizSubmissionDto,
  QuizSubmissionQuery,
} from '../../../types/quiz-submission.types';

export function useQuizSubmissions(query?: QuizSubmissionQuery) {
  return useQuery({
    queryKey: ['quiz-submissions', query],
    queryFn: () => quizSubmissionsService.findAll(query),
  });
}

export function useQuizSubmission(id: number | null) {
  return useQuery({
    queryKey: ['quiz-submissions', id],
    queryFn: () => (id ? quizSubmissionsService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateQuizSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuizSubmissionDto) =>
      quizSubmissionsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions'] });
    },
  });
}

export function useUpdateQuizSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuizSubmissionDto }) =>
      quizSubmissionsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions', variables.id] });
    },
  });
}

export function useDeleteQuizSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => quizSubmissionsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions'] });
    },
  });
}

