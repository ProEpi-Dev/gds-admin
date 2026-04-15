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
  Edit as EditIcon,
} from '@mui/icons-material';
import { useContentQuizzes } from '../../content-quiz/hooks/useContentQuiz';
import { useForms } from '../../forms/hooks/useForms';
import { useCurrentContext } from '../../../contexts/CurrentContextContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

interface QuizWithContent {
  quiz: any;
  content: any;
  contentQuiz: any;
}

export default function QuizzesListPage() {
  const navigate = useNavigate();
  const { currentContext } = useCurrentContext();

  // Backend exige contextId: listar apenas quizzes do contexto atual
  const { data: formsData, isLoading: formsLoading } = useForms(
    {
      type: 'quiz',
      active: true,
      page: 1,
      pageSize: 100,
      contextId: currentContext?.id,
    },
    { enabled: currentContext?.id != null }
  );

  // Buscar todas as associações conteúdo-quiz (contextId para autorização do content_manager)
  const { data: contentQuizzesData, isLoading: contentQuizzesLoading } =
    useContentQuizzes({
      page: 1,
      pageSize: 100,
      active: true,
      contextId: currentContext?.id,
    });

  const isLoading = formsLoading || contentQuizzesLoading;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const quizes = formsData?.data || [];
  const contentQuizzes = contentQuizzesData?.data || [];

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
      };
    })
    .filter((item): item is QuizWithContent => item !== null); // Remover nulls

  if (quizesWithContent.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Quizes no contexto
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          Nenhum quiz disponível no momento. Os quizes aparecerão aqui quando
          forem associados a conteúdos.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Quizes no contexto
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Lista de quizes vinculados a conteúdos neste contexto. Para associá-los a conteúdos, use a seção de Conteúdos.
      </Typography>

      <Stack spacing={3}>
        {quizesWithContent.map((item) => {
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
                        {item.contentQuiz.isRequired && (
                          <Chip label="Obrigatório" color="error" size="small" />
                        )}
                      </Box>

                      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                        <Button
                          variant="contained"
                          onClick={() => navigate(`/quizzes/${item.quiz.id}`)}
                          sx={{ minWidth: '160px' }}
                        >
                          Ver detalhes do quiz
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() =>
                            navigate(`/contents/${item.content.id}/edit`)
                          }
                          sx={{ minWidth: '160px' }}
                        >
                          Editar conteúdo
                        </Button>
                      </Stack>
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

