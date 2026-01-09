import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuizScore from './QuizScore';
import type { QuizSubmission } from '../../types/quiz-submission.types';

const createMockSubmission = (
  overrides?: Partial<QuizSubmission>
): QuizSubmission => ({
  id: 1,
  participationId: 1,
  formVersionId: 1,
  quizResponse: {},
  questionResults: null,
  score: null,
  percentage: null,
  isPassed: null,
  attemptNumber: 1,
  timeSpentSeconds: null,
  startedAt: '2024-01-01T00:00:00.000Z',
  completedAt: null,
  active: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('QuizScore', () => {
  describe('Renderização básica', () => {
    it('deve renderizar o título "Resultado do Quiz"', () => {
      const submission = createMockSubmission({
        percentage: 75.5,
        isPassed: true,
      });

      render(<QuizScore submission={submission} />);
      expect(screen.getByText('Resultado do Quiz')).toBeInTheDocument();
    });

    it('deve renderizar a pontuação formatada corretamente', () => {
      const submission = createMockSubmission({
        percentage: 87.5,
        isPassed: true,
      });

      render(<QuizScore submission={submission} />);
      expect(screen.getByText('87.50%')).toBeInTheDocument();
    });

    it('deve renderizar a barra de progresso', () => {
      const submission = createMockSubmission({
        percentage: 60,
        isPassed: false,
      });

      const { container } = render(<QuizScore submission={submission} />);
      const progressBar = container.querySelector('.MuiLinearProgress-root');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Cores baseadas em isPassed', () => {
    it('deve renderizar pontuação quando isPassed é true', () => {
      const submission = createMockSubmission({
        percentage: 90,
        isPassed: true,
      });

      render(<QuizScore submission={submission} />);
      const percentageText = screen.getByText('90.00%');
      expect(percentageText).toBeInTheDocument();
    });

    it('deve renderizar pontuação quando isPassed é false', () => {
      const submission = createMockSubmission({
        percentage: 40,
        isPassed: false,
      });

      render(<QuizScore submission={submission} />);
      const percentageText = screen.getByText('40.00%');
      expect(percentageText).toBeInTheDocument();
    });
  });

  describe('Pontuação mínima (passingScore)', () => {
    it('deve exibir mensagem de sucesso quando passou e passingScore está definido', () => {
      const submission = createMockSubmission({
        percentage: 85,
        isPassed: true,
      });

      render(<QuizScore submission={submission} passingScore={70} />);
      expect(
        screen.getByText(/✓ Pontuação mínima atingida \(70\.0%\)/)
      ).toBeInTheDocument();
    });

    it('deve exibir mensagem de não atingida quando não passou e passingScore está definido', () => {
      const submission = createMockSubmission({
        percentage: 60,
        isPassed: false,
      });

      render(<QuizScore submission={submission} passingScore={70} />);
      expect(
        screen.getByText(/Pontuação mínima: 70\.0% \(não atingida\)/)
      ).toBeInTheDocument();
    });

    it('não deve exibir mensagem quando passingScore é null', () => {
      const submission = createMockSubmission({
        percentage: 85,
        isPassed: true,
      });

      render(<QuizScore submission={submission} passingScore={null} />);
      expect(
        screen.queryByText(/Pontuação mínima/)
      ).not.toBeInTheDocument();
    });

    it('não deve exibir mensagem quando passingScore é undefined', () => {
      const submission = createMockSubmission({
        percentage: 85,
        isPassed: true,
      });

      render(<QuizScore submission={submission} passingScore={undefined} />);
      expect(
        screen.queryByText(/Pontuação mínima/)
      ).not.toBeInTheDocument();
    });

    it('deve formatar passingScore com 1 casa decimal', () => {
      const submission = createMockSubmission({
        percentage: 85,
        isPassed: true,
      });

      render(<QuizScore submission={submission} passingScore={75.5} />);
      expect(
        screen.getByText(/✓ Pontuação mínima atingida \(75\.5%\)/)
      ).toBeInTheDocument();
    });
  });

  describe('Detalhes (showDetails)', () => {
    it('deve exibir número da tentativa quando showDetails é true', () => {
      const submission = createMockSubmission({
        percentage: 80,
        isPassed: true,
        attemptNumber: 3,
      });

      render(<QuizScore submission={submission} showDetails={true} />);
      expect(screen.getByText('Tentativa: 3')).toBeInTheDocument();
    });

    it('deve exibir data de conclusão quando completedAt está definido', () => {
      const submission = createMockSubmission({
        percentage: 80,
        isPassed: true,
        completedAt: '2024-01-15T14:30:00.000Z',
      });

      render(<QuizScore submission={submission} showDetails={true} />);
      expect(screen.getByText(/Concluído em:/)).toBeInTheDocument();
    });

    it('não deve exibir data de conclusão quando completedAt é null', () => {
      const submission = createMockSubmission({
        percentage: 80,
        isPassed: true,
        completedAt: null,
      });

      render(<QuizScore submission={submission} showDetails={true} />);
      expect(screen.queryByText(/Concluído em:/)).not.toBeInTheDocument();
    });

    it('não deve exibir detalhes quando showDetails é false', () => {
      const submission = createMockSubmission({
        percentage: 80,
        isPassed: true,
        attemptNumber: 2,
        completedAt: '2024-01-15T14:30:00.000Z',
      });

      render(<QuizScore submission={submission} showDetails={false} />);
      expect(screen.queryByText(/Tentativa:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Concluído em:/)).not.toBeInTheDocument();
    });
  });

  describe('Valores padrão e edge cases', () => {
    it('deve usar 0 quando percentage é null', () => {
      const submission = createMockSubmission({
        percentage: null,
        isPassed: false,
      });

      render(<QuizScore submission={submission} />);
      expect(screen.getByText('0.00%')).toBeInTheDocument();
    });

    it('deve usar false quando isPassed é null', () => {
      const submission = createMockSubmission({
        percentage: 50,
        isPassed: null,
      });

      const { container } = render(<QuizScore submission={submission} />);
      expect(screen.getByText('50.00%')).toBeInTheDocument();
    });

    it('deve usar showDetails=true por padrão', () => {
      const submission = createMockSubmission({
        percentage: 80,
        isPassed: true,
        attemptNumber: 1,
      });

      render(<QuizScore submission={submission} />);
      expect(screen.getByText('Tentativa: 1')).toBeInTheDocument();
    });

    it('deve lidar com percentage 0', () => {
      const submission = createMockSubmission({
        percentage: 0,
        isPassed: false,
      });

      render(<QuizScore submission={submission} />);
      expect(screen.getByText('0.00%')).toBeInTheDocument();
    });

    it('deve lidar com percentage 100', () => {
      const submission = createMockSubmission({
        percentage: 100,
        isPassed: true,
      });

      render(<QuizScore submission={submission} />);
      expect(screen.getByText('100.00%')).toBeInTheDocument();
    });
  });
});
