import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useForm } from '../../forms/hooks/useForms';
import { useQuizSubmissions, useCreateQuizSubmission } from '../../quizzes/hooks/useQuizSubmissions';
import { useTrackProgressByParticipationAndCycle } from '../../track-progress/hooks/useTrackProgress';
import QuizRenderer from '../../../components/quiz/QuizRenderer';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useSnackbar } from '../../../hooks/useSnackbar';
import type { QuizDefinition, FormVersionQuizMetadata } from '../../../types/quiz.types';
import type { QuizSubmission } from '../../../types/quiz-submission.types';

export default function TrackCycleQuizTakePage() {
  const { id: cycleIdParam, participationId: participationIdParam, sequenceId: sequenceIdParam } =
    useParams<{ id: string; participationId: string; sequenceId: string }>();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();
  const [quizStarted, setQuizStarted] = useState(false);

  const cycleId = cycleIdParam ? parseInt(cycleIdParam) : null;
  const participationId = participationIdParam ? parseInt(participationIdParam) : null;
  const sequenceId = sequenceIdParam ? parseInt(sequenceIdParam) : null;

  const { data: progress, isLoading: progressLoading, error: progressError } =
    useTrackProgressByParticipationAndCycle(participationId, cycleId);

  const sequenceWithForm = useMemo(() => {
    if (!progress?.track_cycle?.track?.section) return null;
    const sections = progress.track_cycle.track.section as any[];
    for (const section of sections) {
      const sequences = section.sequence ?? [];
      const seq = sequences.find((s: any) => s.id === sequenceId);
      if (seq && seq.form_id) return { sequence: seq, formId: seq.form_id };
    }
    return null;
  }, [progress, sequenceId]);

  const formId = sequenceWithForm?.formId ?? null;
  const { data: quiz, isLoading: quizLoading, error: quizError } = useForm(formId);

  const formVersion = quiz?.latestVersion;
  const quizDefinition: QuizDefinition | null = formVersion?.definition
    ? (formVersion.definition as unknown as QuizDefinition)
    : null;

  const quizMetadata: FormVersionQuizMetadata = {
    passingScore: formVersion?.passingScore ?? null,
    maxAttempts: formVersion?.maxAttempts ?? null,
    timeLimitMinutes: formVersion?.timeLimitMinutes ?? null,
    showFeedback: formVersion?.showFeedback ?? true,
    randomizeQuestions: formVersion?.randomizeQuestions ?? false,
  };

  const participationIdFromProgress = progress?.participation_id;
  const trackProgressId = progress?.id;

  const { data: submissionsData } = useQuizSubmissions(
    participationIdFromProgress && formVersion
      ? {
          participationId: participationIdFromProgress,
          formVersionId: formVersion.id,
          page: 1,
          pageSize: 100,
        }
      : undefined,
  );

  const existingSubmissions: QuizSubmission[] = submissionsData?.data ?? [];
  const createSubmission = useCreateQuizSubmission();

  const backUrl = `/admin/track-cycles/${cycleId}/participation/${participationId}/trilha`;

  const handleSubmit = async (submissionData: any): Promise<QuizSubmission> => {
    if (!participationIdFromProgress || !formVersion || !trackProgressId || !sequenceId) {
      throw new Error('Dados do progresso ou sequência não encontrados');
    }

    return new Promise((resolve, reject) => {
      createSubmission.mutate(
        {
          participationId: participationIdFromProgress,
          formVersionId: formVersion.id,
          quizResponse: submissionData.quizResponse,
          startedAt: submissionData.startedAt,
          completedAt: submissionData.completedAt,
          timeSpentSeconds: submissionData.timeSpentSeconds,
          trackProgressId: trackProgressId ?? undefined,
          sequenceId: sequenceId ?? undefined,
        },
        {
          onSuccess: (submission) => {
            snackbar.showSuccess(
              'Quiz submetido com sucesso! O progresso da trilha foi atualizado.',
            );
            queryClient.invalidateQueries({ queryKey: ['track-progress'] });
            resolve(submission);
            navigate(backUrl);
          },
          onError: (error: any) => {
            const msg =
              error?.response?.data?.message ?? 'Erro ao submeter quiz';
            snackbar.showError(msg);
            reject(new Error(msg));
          },
        },
      );
    });
  };

  if (progressLoading || (formId && quizLoading)) {
    return <LoadingSpinner />;
  }

  if (progressError) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert message={(progressError as Error)?.message ?? 'Erro ao carregar progresso'} />
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backUrl)} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  if (!progress) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert message="Progresso não encontrado" />
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backUrl)} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  if (!sequenceWithForm) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert message="Sequência de quiz não encontrada neste ciclo" />
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backUrl)} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  if (quizError || !quiz || !formVersion) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert message="Quiz não encontrado" />
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backUrl)} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  if (!quizDefinition) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert message="Definição do quiz não encontrada" />
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backUrl)} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  const canAttempt =
    quizMetadata.maxAttempts == null ||
    existingSubmissions.filter((s) => s.completedAt != null).length < (quizMetadata.maxAttempts ?? 0);

  if (!canAttempt && existingSubmissions.length > 0) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backUrl)} sx={{ mb: 2 }}>
          Voltar à trilha
        </Button>
        <Typography variant="h4" gutterBottom>
          {quiz.title}
        </Typography>
        <Alert severity="warning" sx={{ mb: 3 }}>
          O limite de tentativas para este quiz foi atingido.
        </Alert>
        <QuizRenderer
          definition={quizDefinition}
          metadata={quizMetadata}
          participationId={participationIdFromProgress}
          formVersionId={formVersion.id}
          existingSubmissions={existingSubmissions}
          readOnly
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backUrl)} sx={{ mb: 2 }}>
        Voltar à trilha
      </Button>

      <Typography variant="h4" gutterBottom>
        {quiz.title}
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Quiz no contexto do ciclo de trilha. A submissão ficará associada ao progresso da sequência.
      </Alert>

      {existingSubmissions.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Já existem {existingSubmissions.length} tentativa(s). Esta será a tentativa{' '}
          {existingSubmissions.length + 1}.
        </Alert>
      )}

      {!quizStarted ? (
        <Paper elevation={1} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
            <InfoIcon color="primary" sx={{ fontSize: 32, mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Instruções do Quiz
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
                {quiz.description ?? 'Leia atentamente as questões e responda com cuidado. Boa sorte!'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={() => setQuizStarted(true)}
            >
              Iniciar Quiz
            </Button>
          </Box>
        </Paper>
      ) : (
        <QuizRenderer
          definition={quizDefinition}
          metadata={quizMetadata}
          participationId={participationIdFromProgress}
          formVersionId={formVersion.id}
          existingSubmissions={existingSubmissions}
          onSubmit={handleSubmit}
          readOnly={false}
        />
      )}
    </Box>
  );
}
