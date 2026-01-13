import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Quiz as QuizIcon,
  AssignmentInd as AssignmentIndIcon,
} from '@mui/icons-material';
import { useForm } from '../../forms/hooks/useForms';
import { useContentQuizzes } from '../../content-quiz/hooks/useContentQuiz';
import { useQuizSubmissions } from '../hooks/useQuizSubmissions';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';

export default function QuizViewPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const quizIdNum = quizId ? parseInt(quizId, 10) : null;

  // Buscar quiz
  const { data: quiz, isLoading, error } = useForm(quizIdNum);

  // Buscar associações conteúdo-quiz
  const { data: contentQuizzesData, isLoading: contentQuizzesLoading } =
    useContentQuizzes({
      formId: quizIdNum ?? undefined,
      page: 1,
      pageSize: 100,
      active: true,
    });

  // Buscar total de submissões para estatísticas
  const { data: submissionsData } = useQuizSubmissions(
    quiz?.latestVersion
      ? {
          formVersionId: quiz.latestVersion.id,
          page: 1,
          pageSize: 100,
          active: true,
        }
      : undefined
  );

  if (isLoading || contentQuizzesLoading) {
    return <LoadingSpinner />;
  }

  if (error || !quiz) {
    return <ErrorAlert message="Erro ao carregar quiz" />;
  }

  const contentQuizzes = contentQuizzesData?.data || [];
  const submissions = submissionsData?.data || [];
  const formVersion = quiz.latestVersion;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/quizzes')}
        sx={{ mb: 2 }}
      >
        Voltar
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <QuizIcon color="primary" sx={{ fontSize: 40 }} />
        <Typography variant="h4">{quiz.title}</Typography>
      </Box>

      <Stack spacing={3}>
        {/* Informações do Quiz */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Informações do Quiz
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ID
                </Typography>
                <Typography variant="body1">{quiz.id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Referência
                </Typography>
                <Typography variant="body1">{quiz.reference || '-'}</Typography>
              </Box>
              {formVersion && (
                <>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Versão Atual
                    </Typography>
                    <Typography variant="body1">
                      Versão {formVersion.versionNumber}
                    </Typography>
                  </Box>
                  {formVersion.passingScore !== null && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Nota Mínima para Aprovação
                      </Typography>
                      <Typography variant="body1">
                        {Number(formVersion.passingScore).toFixed(1)}%
                      </Typography>
                    </Box>
                  )}
                  {formVersion.maxAttempts !== null && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Máximo de Tentativas
                      </Typography>
                      <Typography variant="body1">
                        {formVersion.maxAttempts}
                      </Typography>
                    </Box>
                  )}
                  {formVersion.timeLimitMinutes !== null && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Tempo Limite
                      </Typography>
                      <Typography variant="body1">
                        {formVersion.timeLimitMinutes} minutos
                      </Typography>
                    </Box>
                  )}
                </>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={quiz.active ? 'Ativo' : 'Inativo'}
                    color={quiz.active ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Estatísticas */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Estatísticas
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total de Submissões
                </Typography>
                <Typography variant="h4">{submissionsData?.meta.totalItems || 0}</Typography>
              </Box>
              {submissions.length > 0 && (
                <>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Taxa de Aprovação
                    </Typography>
                    <Typography variant="h4">
                      {(
                        (submissions.filter((s) => s.isPassed === true).length /
                          submissions.length) *
                        100
                      ).toFixed(1)}
                      %
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Média de Pontuação
                    </Typography>
                    <Typography variant="h4">
                      {(
                        submissions.reduce(
                          (acc, s) => acc + (s.percentage || 0),
                          0
                        ) / submissions.length
                      ).toFixed(1)}
                      %
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Conteúdos Associados */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Conteúdos Associados
            </Typography>
            {contentQuizzes.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Nenhum conteúdo associado a este quiz.
              </Alert>
            ) : (
              <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                  {contentQuizzes.map((cq) => (
                    <Paper
                      key={cq.id}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: 'primary.main',
                          cursor: 'pointer',
                        },
                      }}
                      onClick={() =>
                        navigate(
                          `/quizzes/${quiz.id}/content/${cq.content?.id || ''}`
                        )
                      }
                    >
                        <Typography variant="subtitle1" gutterBottom>
                          {cq.content?.title || 'Sem título'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                          {cq.isRequired && (
                            <Chip
                              label="Obrigatório"
                              color="error"
                              size="small"
                            />
                          )}
                          <Chip
                            label={`Ordem: ${cq.displayOrder}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Paper>
                  ))}
              </Box>
            )}
          </Paper>
        </Box>

        {/* Ações Rápidas */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ações
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AssignmentIndIcon />}
                onClick={() =>
                  navigate('/quiz-submissions', {
                    state: { formId: quiz.id },
                  })
                }
              >
                Ver Todas as Submissões
              </Button>
              {formVersion && (
                <Button
                  variant="outlined"
                  onClick={() =>
                    navigate(`/forms/${quiz.id}/versions/${formVersion.id}`)
                  }
                >
                  Ver Versão do Formulário
                </Button>
              )}
            </Box>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}

