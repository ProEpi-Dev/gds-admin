import { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import FormRenderer from '../form-renderer/FormRenderer';
import QuizTimer from './QuizTimer';
import QuizAttempts from './QuizAttempts';
import QuizScore from './QuizScore';
import QuizQuestionResults from './QuizQuestionResults';
import type { QuizDefinition, FormVersionQuizMetadata } from '../../types/quiz.types';
import type { QuizSubmission } from '../../types/quiz-submission.types';

interface QuizRendererProps {
  definition: QuizDefinition;
  metadata?: FormVersionQuizMetadata;
  participationId: number;
  formVersionId: number;
  existingSubmissions?: QuizSubmission[];
  onSubmit?: (submission: any) => void;
  readOnly?: boolean;
}

export default function QuizRenderer({
  definition,
  metadata,
  participationId,
  formVersionId,
  existingSubmissions = [],
  onSubmit,
  readOnly = false,
}: QuizRendererProps) {
  const [quizResponse, setQuizResponse] = useState<any>({});
  const [startedAt] = useState<Date>(new Date());
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentSubmission, setCurrentSubmission] =
    useState<QuizSubmission | null>(null);

  const timeLimitMinutes = metadata?.timeLimitMinutes ?? null;
  const maxAttempts = metadata?.maxAttempts ?? null;
  const showFeedback = metadata?.showFeedback ?? true;

  // Se estiver em modo readOnly e houver submissões, usar a última submissão
  useEffect(() => {
    if (readOnly && existingSubmissions.length > 0) {
      const lastSubmission = existingSubmissions
        .filter((s) => s.completedAt)
        .sort(
          (a, b) =>
            new Date(b.completedAt!).getTime() -
            new Date(a.completedAt!).getTime()
        )[0];
      
      if (lastSubmission && lastSubmission.quizResponse) {
        setCurrentSubmission(lastSubmission);
        setIsCompleted(true);
        setQuizResponse(lastSubmission.quizResponse);
      }
    }
  }, [readOnly, existingSubmissions]);

  const handleResponseChange = (values: any) => {
    setQuizResponse(values);
  };

  const handleSubmit = async () => {
    if (readOnly || isCompleted) return;

    const completedAt = new Date();
    const timeSpentSeconds = Math.floor(
      (completedAt.getTime() - startedAt.getTime()) / 1000,
    );

    const submissionData = {
      participationId,
      formVersionId,
      quizResponse,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      timeSpentSeconds,
    };

    if (onSubmit) {
      const submission = await onSubmit(submissionData);
      setCurrentSubmission(submission);
      setIsCompleted(true);
    }
  };

  const handleTimeUp = () => {
    if (!readOnly && !isCompleted) {
      handleSubmit();
    }
  };

  // Mostrar resultados quando o quiz está completo ou quando está em modo readOnly com submissão
  if ((isCompleted && currentSubmission && showFeedback) || 
      (readOnly && currentSubmission && showFeedback && currentSubmission.completedAt)) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          {definition.title || 'Quiz'}
        </Typography>
        {definition.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {definition.description}
          </Typography>
        )}
        <QuizScore submission={currentSubmission} />
        
        {/* Feedback detalhado por questão */}
        {currentSubmission.questionResults && currentSubmission.questionResults.length > 0 && (
          <QuizQuestionResults
            definition={definition}
            questionResults={currentSubmission.questionResults}
          />
        )}
        
        {/* Mostrar o quiz com as respostas em modo somente leitura */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Suas Respostas
          </Typography>
          <FormRenderer
            definition={definition}
            initialValues={currentSubmission.quizResponse || {}}
            onChange={handleResponseChange}
            readOnly={true}
            isQuiz={true}
          />
        </Paper>
        
        {definition.feedback?.messages && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="body1">
              {currentSubmission.isPassed
                ? definition.feedback.messages.passed ||
                  'Parabéns! Você foi aprovado!'
                : definition.feedback.messages.failed ||
                  'Você não atingiu a nota mínima. Tente novamente!'}
            </Typography>
          </Paper>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {definition.title || 'Quiz'}
      </Typography>
      {definition.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {definition.description}
        </Typography>
      )}

      {existingSubmissions.length > 0 && (
        <QuizAttempts
          submissions={existingSubmissions}
          maxAttempts={maxAttempts}
          currentAttempt={existingSubmissions.length + 1}
        />
      )}

      {timeLimitMinutes && timeLimitMinutes > 0 && (
        <QuizTimer
          timeLimitMinutes={timeLimitMinutes}
          startedAt={startedAt}
          onTimeUp={handleTimeUp}
          autoSubmit={true}
        />
      )}

      <Paper sx={{ p: 3, mt: 2 }}>
        <FormRenderer
          definition={definition}
          initialValues={readOnly && currentSubmission?.quizResponse ? currentSubmission.quizResponse : {}}
          onChange={handleResponseChange}
          readOnly={readOnly}
          isQuiz={true}
        />
      </Paper>

      {!readOnly && !isCompleted && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!quizResponse._isValid}
          >
            Finalizar Quiz
          </Button>
        </Box>
      )}
    </Box>
  );
}

