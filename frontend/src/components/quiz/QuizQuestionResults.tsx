import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HelpOutline as HelpOutlineIcon,
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
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: isCorrect ? 'success.main' : 'error.main',
                bgcolor: isCorrect
                  ? 'rgba(76, 175, 80, 0.1)'
                  : 'rgba(244, 67, 54, 0.1)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                }}
              >
                {/* Ícone de acerto/erro */}
                <Box sx={{ mt: 0.5 }}>
                  {isCorrect ? (
                    <CheckCircleIcon color="success" fontSize="large" />
                  ) : (
                    <CancelIcon color="error" fontSize="large" />
                  )}
                </Box>

                {/* Conteúdo da questão */}
                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {question?.label || result.questionName}
                    </Typography>
                    <Chip
                      label={isCorrect ? 'Correto' : 'Incorreto'}
                      color={isCorrect ? 'success' : 'error'}
                      size="small"
                    />
                    <Chip
                      label={`${result.pointsEarned}/${result.pointsTotal} pontos`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  {question?.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {question.description}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Respostas */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        Sua resposta:
                      </Typography>
                      <Chip
                        label={userAnswerLabel}
                        color={isCorrect ? 'success' : 'default'}
                        variant={isCorrect ? 'filled' : 'outlined'}
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: isCorrect
                            ? 'success.main'
                            : 'error.main',
                          color: 'white',
                        }}
                      />
                    </Box>

                    {!isCorrect && (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 0.5 }}
                        >
                          Resposta correta:
                        </Typography>
                        <Chip
                          label={correctAnswerLabel}
                          color="success"
                          sx={{
                            fontWeight: 'bold',
                            bgcolor: 'success.light',
                            color: 'success.contrastText',
                          }}
                        />
                      </Box>
                    )}

                    {/* Feedback */}
                    {result.feedback && (
                      <Alert
                        severity={isCorrect ? 'success' : 'info'}
                        icon={
                          isCorrect ? (
                            <CheckCircleIcon />
                          ) : (
                            <HelpOutlineIcon />
                          )
                        }
                        sx={{ mt: 1 }}
                      >
                        <Typography variant="body2">{result.feedback}</Typography>
                      </Alert>
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

