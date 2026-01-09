import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Book as BookIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useContentQuizzes } from '../../content-quiz/hooks/useContentQuiz';
import { useForms } from '../../forms/hooks/useForms';
import { useQuizSubmissions } from '../hooks/useQuizSubmissions';
import { useAuth } from '../../../contexts/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

interface QuizWithContent {
  quiz: any;
  content: any;
  contentQuiz: any;
  submissions: any[];
}

export default function QuizzesListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const participation = user?.participation || null;

  // Buscar todos os quizes (sem filtro de contexto para pegar todos os quizes associados)
  // Nota: O backend filtra por contexto, então pode não retornar todos os quizes
  // Por isso vamos usar os dados do form que vêm no content-quiz
  const { data: formsData, isLoading: formsLoading } = useForms({
    type: 'quiz',
    active: true,
    page: 1,
    pageSize: 100,
  });

  // Buscar todas as associações conteúdo-quiz
  const { data: contentQuizzesData, isLoading: contentQuizzesLoading } =
    useContentQuizzes({
      page: 1,
      pageSize: 100,
      active: true,
    });

  // Buscar submissões do usuário atual
  const { data: submissionsData, isLoading: submissionsLoading } =
    useQuizSubmissions(
      participation
        ? {
            participationId: participation.id,
            page: 1,
            pageSize: 100,
          }
        : undefined
    );

  const isLoading =
    formsLoading || contentQuizzesLoading || submissionsLoading;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const quizes = formsData?.data || [];
  const contentQuizzes = contentQuizzesData?.data || [];
  const submissions = submissionsData?.data || [];

  // Se temos content-quizzes mas não temos o quiz na lista, precisamos buscar o quiz individualmente
  // Criar um mapa de quizes por ID para busca rápida
  const quizesMap = new Map(quizes.map((quiz) => [quiz.id, quiz]));

  // Agrupar quizes com seus conteúdos - começar pelos content-quizzes
  const quizesWithContent: QuizWithContent[] = contentQuizzes
    .map((cq) => {
      // Buscar o quiz correspondente
      let quiz = quizesMap.get(cq.formId);

      // Se não encontrou na lista, pode ser que o quiz não esteja ativo ou não esteja no contexto
      // Mas ainda assim podemos usar os dados do form que vêm no content-quiz
      if (!quiz && cq.form) {
        // Criar um objeto quiz básico a partir dos dados do form no content-quiz
        quiz = {
          id: cq.form.id,
          title: cq.form.title,
          reference: cq.form.reference,
          type: cq.form.type as 'quiz',
          active: true, // Assumir ativo se está associado
          contextId: null,
          description: null,
          createdAt: '',
          updatedAt: '',
          latestVersion: null, // Será buscado depois se necessário
        };
      }

      // Se ainda não tem quiz ou não tem conteúdo, pular
      if (!quiz || !cq.content) {
        return null;
      }

      return {
        quiz,
        content: cq.content,
        contentQuiz: cq,
        submissions: submissions.filter(
          (s) =>
            s.formVersionId === quiz.latestVersion?.id &&
            s.participationId === participation?.id
        ),
      };
    })
    .filter((item): item is QuizWithContent => item !== null); // Remover nulls

  if (quizesWithContent.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Quizes Disponíveis
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          Nenhum quiz disponível no momento. Os quizes aparecerão aqui quando
          forem associados a conteúdos.
        </Alert>
      </Box>
    );
  }

  const getQuizStatus = (item: QuizWithContent) => {
    const latestSubmission = item.submissions
      .filter((s) => s.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime()
      )[0];

    if (!latestSubmission) {
      return { label: 'Não iniciado', color: 'default' as const };
    }

    if (latestSubmission.isPassed) {
      return { label: 'Aprovado', color: 'success' as const };
    }

    return { label: 'Reprovado', color: 'error' as const };
  };

  const canAttempt = (item: QuizWithContent) => {
    const formVersion = item.quiz.latestVersion;
    if (!formVersion) return false;

    const maxAttempts = formVersion.maxAttempts;
    if (maxAttempts === null || maxAttempts === undefined) return true;

    const completedAttempts = item.submissions.filter(
      (s) => s.completedAt !== null
    ).length;

    return completedAttempts < maxAttempts;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Quizes Disponíveis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Leia o conteúdo e responda os quizes associados
      </Typography>

      <Stack spacing={3}>
        {quizesWithContent.map((item) => {
          const status = getQuizStatus(item);
          const canStart = canAttempt(item);

          return (
            <Box key={`${item.quiz.id}-${item.content.id}`}>
              <Card
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <QuizIcon color="primary" />
                        <Typography variant="h6" component="h2">
                          {item.quiz.title}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <BookIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {item.content.title}
                        </Typography>
                      </Box>

                      {item.content.summary && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {item.content.summary.substring(0, 150)}
                          {item.content.summary.length > 150 ? '...' : ''}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', minWidth: '200px' }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Chip
                          label={status.label}
                          color={status.color}
                          size="small"
                          icon={status.color === 'success' ? <CheckCircleIcon /> : undefined}
                        />
                        {item.contentQuiz.isRequired && (
                          <Chip label="Obrigatório" color="error" size="small" />
                        )}
                        {item.submissions.length > 0 && (
                          <Chip
                            label={`${item.submissions.length} tentativa(s)`}
                            size="small"
                          />
                        )}
                      </Box>

                      {item.submissions.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Última tentativa:{' '}
                          {item.submissions[0].score !== null
                            ? `${item.submissions[0].score.toFixed(1)}%`
                            : 'Em andamento'}
                        </Typography>
                      )}

                      <Button
                        variant="contained"
                        onClick={() =>
                          navigate(
                            `/quizzes/${item.quiz.id}/content/${item.content.id}`
                          )
                        }
                        disabled={false}
                        sx={{ minWidth: '180px' }}
                      >
                        {item.submissions.length === 0
                          ? 'Iniciar Quiz'
                          : canStart
                            ? 'Refazer Quiz'
                            : 'Visualizar Resultado'}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

