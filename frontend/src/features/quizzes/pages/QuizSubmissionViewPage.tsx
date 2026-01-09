import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuizSubmission, useDeleteQuizSubmission } from '../hooks/useQuizSubmissions';
import { useForm } from '../../forms/hooks/useForms';
import QuizRenderer from '../../../components/quiz/QuizRenderer';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useSnackbar } from '../../../hooks/useSnackbar';
import type { QuizDefinition, FormVersionQuizMetadata } from '../../../types/quiz.types';

export default function QuizSubmissionViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const submissionId = id ? parseInt(id, 10) : null;

  // Buscar submissão
  const { data: submission, isLoading, error } = useQuizSubmission(submissionId);
  const deleteMutation = useDeleteQuizSubmission();

  // Buscar quiz para obter a definição
  const formId = submission?.formVersion?.form?.id;
  const { data: quiz } = useForm(formId || undefined);

  const formVersion = quiz?.latestVersion;
  const quizDefinition: QuizDefinition | null = formVersion?.definition
    ? (formVersion.definition as unknown as QuizDefinition)
    : null;

  const quizMetadata: FormVersionQuizMetadata = {
    passingScore: formVersion?.passingScore ?? undefined,
    maxAttempts: formVersion?.maxAttempts ?? undefined,
    timeLimitMinutes: formVersion?.timeLimitMinutes ?? undefined,
    showFeedback: formVersion?.showFeedback ?? true,
    randomizeQuestions: formVersion?.randomizeQuestions ?? false,
  };

  const handleDelete = () => {
    if (submissionId) {
      deleteMutation.mutate(submissionId, {
        onSuccess: () => {
          snackbar.showSuccess('Submissão deletada com sucesso');
          navigate(-1);
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.message || 'Erro ao deletar submissão';
          snackbar.showError(errorMessage);
        },
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !submission) {
    return <ErrorAlert message="Erro ao carregar submissão" />;
  }

  if (!quizDefinition || !formVersion) {
    return <ErrorAlert message="Definição do quiz não encontrada" />;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Voltar
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          Deletar Submissão
        </Button>
      </Box>

      <Typography variant="h4" gutterBottom>
        Submissão #{submission.id}
      </Typography>

      {/* Informações da Submissão */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Informações da Submissão
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Quiz
              </Typography>
              <Typography variant="body1">
                {submission.formVersion?.form?.title || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Usuário
              </Typography>
              <Typography variant="body1">
                {submission.participation?.user?.name || 'N/A'}
              </Typography>
              {submission.participation?.user?.email && (
                <Typography variant="caption" color="text.secondary">
                  {submission.participation.user.email}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Tentativa
              </Typography>
              <Typography variant="body1">{submission.attemptNumber}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Concluído em
              </Typography>
              <Typography variant="body1">
                {submission.completedAt
                  ? new Date(submission.completedAt).toLocaleString('pt-BR')
                  : 'Não concluído'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Resultado do Quiz */}
      {submission.completedAt && quizDefinition && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <QuizRenderer
            definition={quizDefinition}
            metadata={quizMetadata}
            participationId={submission.participationId}
            formVersionId={submission.formVersionId}
            existingSubmissions={[submission]}
            readOnly={true}
          />
        </Paper>
      )}

      {!submission.completedAt && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Esta submissão ainda não foi concluída.
        </Alert>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja deletar a submissão #${submission.id}? Esta ação não pode ser desfeita.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

