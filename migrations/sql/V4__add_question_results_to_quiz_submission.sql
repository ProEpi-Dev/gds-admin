-- Migration V4: Adicionar question_results ao quiz_submission
-- Armazena resultados detalhados por questão (acerto/erro, pontos, feedback)

ALTER TABLE quiz_submission 
ADD COLUMN IF NOT EXISTS question_results JSON;

COMMENT ON COLUMN quiz_submission.question_results IS 'Resultados detalhados por questão: array de objetos com {questionName, isCorrect, pointsEarned, userAnswer, correctAnswer, feedback}';

