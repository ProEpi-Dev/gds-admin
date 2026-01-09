import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuizQuestionResults from './QuizQuestionResults';
import type { QuizDefinition } from '../../types/quiz.types';
import type { QuestionResult } from '../../types/quiz-submission.types';

const createMockDefinition = (
  overrides?: Partial<QuizDefinition>
): QuizDefinition => ({
  fields: [],
  ...overrides,
});

const createMockQuestionResult = (
  overrides?: Partial<QuestionResult>
): QuestionResult => ({
  questionName: 'question1',
  isCorrect: true,
  pointsEarned: 1,
  pointsTotal: 1,
  userAnswer: 'answer1',
  correctAnswer: 'answer1',
  ...overrides,
});

describe('QuizQuestionResults', () => {
  describe('Renderização básica', () => {
    it('deve renderizar o título "Resultado por Questão"', () => {
      const definition = createMockDefinition();
      const questionResults: QuestionResult[] = [];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );
      expect(screen.getByText('Resultado por Questão')).toBeInTheDocument();
    });

    it('deve renderizar todas as questões', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão 1',
          },
          {
            id: 'q2',
            name: 'question2',
            type: 'text',
            label: 'Questão 2',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: true,
        }),
        createMockQuestionResult({
          questionName: 'question2',
          isCorrect: false,
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('Questão 1')).toBeInTheDocument();
      expect(screen.getByText('Questão 2')).toBeInTheDocument();
    });
  });

  describe('Questões corretas', () => {
    it('deve exibir ícone de check para questão correta', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão Correta',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: true,
        }),
      ];

      const { container } = render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      // Verificar se o ícone CheckCircle está presente (Material-UI usa class)
      const checkIcon = container.querySelector('.MuiSvgIcon-root');
      expect(checkIcon).toBeInTheDocument();
    });

    it('deve exibir pontos ganhos para questão correta', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão Correta',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: true,
          pointsEarned: 2,
          pointsTotal: 2,
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('2/2 pontos')).toBeInTheDocument();
    });

    it('não deve exibir resposta correta quando questão está correta', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão Correta',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: true,
          userAnswer: 'resposta correta',
          correctAnswer: 'resposta correta',
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.queryByText(/Resposta correta:/)).not.toBeInTheDocument();
    });
  });

  describe('Questões incorretas', () => {
    it('deve exibir ícone de cancel para questão incorreta', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão Incorreta',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: false,
        }),
      ];

      const { container } = render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      // Verificar se o ícone Cancel está presente (Material-UI usa class)
      const cancelIcon = container.querySelector('.MuiSvgIcon-root');
      expect(cancelIcon).toBeInTheDocument();
    });

    it('deve exibir resposta correta quando questão está incorreta', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão Incorreta',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: false,
          userAnswer: 'resposta errada',
          correctAnswer: 'resposta correta',
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText(/Resposta correta:/)).toBeInTheDocument();
      expect(screen.getByText('resposta correta')).toBeInTheDocument();
    });

    it('deve exibir pontos ganhos como 0 para questão incorreta', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão Incorreta',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: false,
          pointsEarned: 0,
          pointsTotal: 1,
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('0/1 pontos')).toBeInTheDocument();
    });
  });

  describe('Formatação de respostas com opções', () => {
    it('deve usar label da opção quando questão tem options', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'select',
            label: 'Questão com Opções',
            options: [
              { label: 'Opção A', value: 'a' },
              { label: 'Opção B', value: 'b' },
              { label: 'Opção C', value: 'c' },
            ],
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: true,
          userAnswer: 'a',
          correctAnswer: 'a',
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('Opção A')).toBeInTheDocument();
    });

    it('deve usar valor original quando opção não é encontrada', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'select',
            label: 'Questão com Opções',
            options: [
              { label: 'Opção A', value: 'a' },
              { label: 'Opção B', value: 'b' },
            ],
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: false,
          userAnswer: 'x', // Valor que não existe nas opções
          correctAnswer: 'a',
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('x')).toBeInTheDocument();
      expect(screen.getByText('Opção A')).toBeInTheDocument(); // Resposta correta
    });

    it('deve funcionar com valores numéricos nas opções', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'select',
            label: 'Questão Numérica',
            options: [
              { label: 'Um', value: 1 },
              { label: 'Dois', value: 2 },
            ],
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: true,
          userAnswer: 1,
          correctAnswer: 1,
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('Um')).toBeInTheDocument();
    });
  });

  describe('Feedback', () => {
    it('deve exibir feedback quando disponível', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão com Feedback',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: true,
          feedback: 'Parabéns! Você acertou!',
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('Parabéns! Você acertou!')).toBeInTheDocument();
    });

    it('não deve exibir seção de feedback quando feedback é undefined', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão sem Feedback',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: true,
          feedback: undefined,
        }),
      ];

      const { container } = render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      // Não deve ter borda superior (que indica seção de feedback)
      const feedbackSection = container.querySelector('[style*="border-top"]');
      expect(feedbackSection).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('deve usar questionName quando questão não é encontrada na definição', () => {
      const definition = createMockDefinition({
        fields: [],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'questionNotFound',
          isCorrect: true,
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('questionNotFound')).toBeInTheDocument();
    });

    it('deve lidar com lista vazia de resultados', () => {
      const definition = createMockDefinition({
        fields: [],
      });

      const questionResults: QuestionResult[] = [];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('Resultado por Questão')).toBeInTheDocument();
    });

    it('deve usar index como key quando questionName não está disponível', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão 1',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        {
          ...createMockQuestionResult({
            questionName: 'question1',
            isCorrect: true,
          }),
          questionName: '', // questionName vazio
        },
      ];

      const { container } = render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      // Deve renderizar sem erros
      expect(container).toBeInTheDocument();
    });

    it('deve exibir múltiplas questões com diferentes estados', () => {
      const definition = createMockDefinition({
        fields: [
          {
            id: 'q1',
            name: 'question1',
            type: 'text',
            label: 'Questão 1',
          },
          {
            id: 'q2',
            name: 'question2',
            type: 'text',
            label: 'Questão 2',
          },
          {
            id: 'q3',
            name: 'question3',
            type: 'text',
            label: 'Questão 3',
          },
        ],
      });

      const questionResults: QuestionResult[] = [
        createMockQuestionResult({
          questionName: 'question1',
          isCorrect: true,
          pointsEarned: 2,
          pointsTotal: 2,
        }),
        createMockQuestionResult({
          questionName: 'question2',
          isCorrect: false,
          pointsEarned: 0,
          pointsTotal: 1,
          userAnswer: 'errado',
          correctAnswer: 'correto',
        }),
        createMockQuestionResult({
          questionName: 'question3',
          isCorrect: true,
          pointsEarned: 1,
          pointsTotal: 1,
          feedback: 'Muito bem!',
        }),
      ];

      render(
        <QuizQuestionResults
          definition={definition}
          questionResults={questionResults}
        />
      );

      expect(screen.getByText('Questão 1')).toBeInTheDocument();
      expect(screen.getByText('Questão 2')).toBeInTheDocument();
      expect(screen.getByText('Questão 3')).toBeInTheDocument();
      expect(screen.getByText('2/2 pontos')).toBeInTheDocument();
      expect(screen.getByText('0/1 pontos')).toBeInTheDocument();
      expect(screen.getByText('1/1 pontos')).toBeInTheDocument();
      expect(screen.getByText('Muito bem!')).toBeInTheDocument();
    });
  });
});
