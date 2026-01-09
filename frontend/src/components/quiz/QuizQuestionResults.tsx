import {
  Box,
  Paper,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import type { QuestionResult } from '../../types/quiz-submission.types';
import type { QuizDefinition } from '../../types/quiz.types';

interface QuizQuestionResultsProps {
  definition: QuizDefinition;
  questionResults: QuestionResult[];
}

export default function QuizQuestionResults({
  definition,
  questionResults,
}: QuizQuestionResultsProps) {
  // Criar um mapa de questões por nome para busca rápida
  const questionsMap = new Map(
    definition.fields.map((field) => [field.name, field])
  );

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Resultado por Questão
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
        {questionResults.map((result, index) => {
          const question = questionsMap.get(result.questionName);
          const isCorrect = result.isCorrect;

          // Encontrar a opção selecionada e a correta
          let userAnswerLabel = String(result.userAnswer);
          let correctAnswerLabel = String(result.correctAnswer);

          if (question?.options) {
            const userOption = question.options.find(
              (opt) => String(opt.value) === String(result.userAnswer)
            );
            const correctOption = question.options.find(
              (opt) => String(opt.value) === String(result.correctAnswer)
            );

            if (userOption) userAnswerLabel = userOption.label;
            if (correctOption) correctAnswerLabel = correctOption.label;
          }

          return (
            <Paper
              key={result.questionName || index}
              elevation={0}
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderLeft: `4px solid ${isCorrect ? 'success.main' : 'error.main'}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ mt: 0.5 }}>
                  {isCorrect ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <CancelIcon color="error" fontSize="small" />
                  )}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                      {question?.label || result.questionName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {result.pointsEarned}/{result.pointsTotal} pontos
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Sua resposta:
                      </Typography>
                      <Typography variant="body2">
                        {userAnswerLabel}
                      </Typography>
                    </Box>

                    {!isCorrect && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Resposta correta:
                        </Typography>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                          {correctAnswerLabel}
                        </Typography>
                      </Box>
                    )}

                    {result.feedback && (
                      <Box
                        sx={{
                          mt: 1.5,
                          pt: 1.5,
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {result.feedback}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}

