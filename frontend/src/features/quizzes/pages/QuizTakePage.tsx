import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Book as BookIcon,
  Quiz as QuizIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { useForm } from '../../forms/hooks/useForms';
import { useContentQuizzes } from '../../content-quiz/hooks/useContentQuiz';
import { useQuizSubmissions, useCreateQuizSubmission } from '../hooks/useQuizSubmissions';
import { useAuth } from '../../../contexts/AuthContext';
import { contentService } from '../../../api/services/content.service';
import { useQuery } from '@tanstack/react-query';
import QuizRenderer from '../../../components/quiz/QuizRenderer';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useSnackbar } from '../../../hooks/useSnackbar';
import type { QuizDefinition, FormVersionQuizMetadata } from '../../../types/quiz.types';
import type { QuizSubmission } from '../../../types/quiz-submission.types';

export default function QuizTakePage() {
  const { quizId, contentId } = useParams<{ quizId: string; contentId: string }>();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const participation = user?.participation || null;
  const [activeTab, setActiveTab] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);

  const quizIdNum = quizId ? parseInt(quizId, 10) : null;
  const contentIdNum = contentId ? parseInt(contentId, 10) : null;

  // Buscar quiz
  const { data: quiz, isLoading: quizLoading, error: quizError } = useForm(quizIdNum);

  // Buscar conteúdo diretamente
  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ['content', contentIdNum],
    queryFn: () => (contentIdNum ? contentService.findOne(contentIdNum) : null),
    enabled: !!contentIdNum,
  });

  // Buscar associação conteúdo-quiz
  useContentQuizzes({
    contentId: contentIdNum ?? undefined,
    formId: quizIdNum ?? undefined,
    page: 1,
    pageSize: 1,
  });

  // Buscar versão do quiz
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

  // Buscar submissões anteriores
  const { data: submissionsData } = useQuizSubmissions(
    participation && formVersion
      ? {
          participationId: participation.id,
          formVersionId: formVersion.id,
          page: 1,
          pageSize: 100,
        }
      : undefined
  );

  const existingSubmissions: QuizSubmission[] = submissionsData?.data || [];
  const createSubmission = useCreateQuizSubmission();

  const handleSubmit = async (submissionData: any): Promise<QuizSubmission> => {
    if (!participation || !formVersion) {
      throw new Error('Participação ou versão do formulário não encontrada');
    }

    return new Promise((resolve, reject) => {
      createSubmission.mutate(
        {
          participationId: participation.id,
          formVersionId: formVersion.id,
          quizResponse: submissionData.quizResponse,
          startedAt: submissionData.startedAt,
          completedAt: submissionData.completedAt,
          timeSpentSeconds: submissionData.timeSpentSeconds,
        },
        {
          onSuccess: (data) => {
            snackbar.showSuccess('Quiz submetido com sucesso!');
            resolve(data);
          },
          onError: (error: any) => {
            const errorMessage =
              error?.response?.data?.message || 'Erro ao submeter quiz';
            snackbar.showError(errorMessage);
            reject(new Error(errorMessage));
          },
        }
      );
    });
  };

  if (quizLoading || contentLoading) {
    return <LoadingSpinner />;
  }

  if (quizError || !quiz || !formVersion) {
    return <ErrorAlert message="Erro ao carregar quiz" />;
  }

  if (!content) {
    return <ErrorAlert message="Conteúdo não encontrado" />;
  }

  if (!quizDefinition) {
    return <ErrorAlert message="Definição do quiz não encontrada" />;
  }

  if (!participation) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert message="Você precisa estar participando de um contexto para responder quizes. Por favor, faça login novamente ou entre em contato com o administrador." />
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/quizzes')}
          sx={{ mt: 2 }}
        >
          Voltar
        </Button>
      </Box>
    );
  }

  // Verificar se pode fazer nova tentativa
  const canAttempt =
    quizMetadata.maxAttempts === null ||
    quizMetadata.maxAttempts === undefined ||
    existingSubmissions.filter((s) => s.completedAt !== null).length <
      quizMetadata.maxAttempts;

  if (!canAttempt && existingSubmissions.length > 0) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/quizzes')}
          sx={{ mb: 2 }}
        >
          Voltar
        </Button>

        <Typography variant="h4" gutterBottom>
          {quiz.title}
        </Typography>

        <Alert severity="warning" sx={{ mb: 3 }}>
          Você atingiu o limite de tentativas para este quiz.
        </Alert>

        {quizDefinition && (
          <QuizRenderer
            definition={quizDefinition}
            metadata={quizMetadata}
            participationId={participation.id}
            formVersionId={formVersion.id}
            existingSubmissions={existingSubmissions}
            readOnly={true}
          />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/quizzes')}
        sx={{ mb: 2 }}
      >
        Voltar
      </Button>

      <Typography variant="h4" gutterBottom>
        {quiz.title}
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue);
            if (newValue === 0) {
              setQuizStarted(false);
            }
          }}
        >
          <Tab
            icon={<BookIcon />}
            iconPosition="start"
            label="Conteúdo"
          />
          <Tab
            icon={<QuizIcon />}
            iconPosition="start"
            label="Quiz"
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {content.title}
              </Typography>
              {content.summary && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {content.summary}
                </Typography>
              )}
              <Box
                sx={{
                  '& img': { maxWidth: '100%', height: 'auto' },
                  '& iframe': { maxWidth: '100%' },
                }}
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={() => setActiveTab(1)}
                >
                  Ir para o Quiz
                </Button>
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              {existingSubmissions.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Você já fez {existingSubmissions.length} tentativa(s). Esta será
                  a tentativa {existingSubmissions.length + 1}.
                </Alert>
              )}

              {!quizStarted && (
                <Paper
                  elevation={1}
                  sx={{
                    p: 3,
                    mb: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                    <InfoIcon color="primary" sx={{ fontSize: 32, mt: 0.5 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        Instruções do Quiz
                      </Typography>
                      {quiz.description ? (
                        <Typography
                          variant="body1"
                          color="text.secondary"
                          sx={{
                            mt: 2,
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {quiz.description}
                        </Typography>
                      ) : (
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                          Leia atentamente as questões e responda com cuidado. 
                          Boa sorte!
                        </Typography>
                      )}
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
              )}

              {quizStarted && (
                <QuizRenderer
                  definition={quizDefinition}
                  metadata={quizMetadata}
                  participationId={participation?.id || 0}
                  formVersionId={formVersion.id}
                  existingSubmissions={existingSubmissions}
                  onSubmit={handleSubmit}
                  readOnly={false}
                />
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

