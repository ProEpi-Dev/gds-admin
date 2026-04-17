import { Injectable } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';

/**
 * Métricas de negócio exportadas via OTLP → Prometheus.
 * Nomes finais no Prometheus costumam ser estes contadores + sufixo _total, ex.:
 * gds_participation_created_total, gds_auth_login_total{outcome="success|failure"}.
 */
@Injectable()
export class BusinessMetricsService {
  private readonly meter = metrics.getMeter('gds-business-metrics', '1.0.0');

  private readonly participationCreated = this.meter.createCounter(
    'gds_participation_created',
    { description: 'Participações criadas pela API (exclui signup, que tem métrica própria).' },
  );

  private readonly quizSubmissionCreated = this.meter.createCounter(
    'gds_quiz_submission_created',
    { description: 'Submissões de quiz criadas.' },
  );

  private readonly reportCreated = this.meter.createCounter('gds_report_created', {
    description: 'Relatórios de vigilância criados.',
  });

  private readonly authLogin = this.meter.createCounter('gds_auth_login', {
    description: 'Tentativas de login (outcome=success|failure).',
  });

  private readonly authSignup = this.meter.createCounter('gds_auth_signup', {
    description: 'Cadastros concluídos com sucesso (signup).',
  });

  private readonly trackProgressStarted = this.meter.createCounter(
    'gds_track_progress_started',
    { description: 'Inícios de progresso em ciclo de trilha.' },
  );

  private readonly syndromeClassification = this.meter.createCounter(
    'gds_syndrome_classification',
    { description: 'Processamentos de classificação sindrômica por status.' },
  );

  private readonly syndromeClassificationDurationMs = this.meter.createHistogram(
    'gds_syndrome_classification_duration_ms',
    { description: 'Duração do processamento sindrômico em milissegundos.' },
  );

  private readonly syndromeScoreGenerated = this.meter.createCounter(
    'gds_syndrome_score_generated',
    {
      description:
        'Scores sindrômicos gerados por síndrome e status de limiar.',
    },
  );

  recordParticipationCreated(): void {
    this.participationCreated.add(1);
  }

  recordQuizSubmissionCreated(attrs: {
    completed: boolean;
    passed: boolean | null;
  }): void {
    let passedLabel: string;
    if (attrs.passed === true) {
      passedLabel = 'true';
    } else if (attrs.passed === false) {
      passedLabel = 'false';
    } else {
      passedLabel = 'na';
    }
    this.quizSubmissionCreated.add(1, {
      completed: String(attrs.completed),
      passed: passedLabel,
    });
  }

  recordReportCreated(
    reportType: string,
    channel?: 'web' | 'app',
  ): void {
    this.reportCreated.add(1, {
      report_type: reportType,
      ...(channel ? { channel } : {}),
    });
  }

  recordAuthLogin(outcome: 'success' | 'failure'): void {
    this.authLogin.add(1, { outcome });
  }

  recordAuthSignupCompleted(): void {
    this.authSignup.add(1);
  }

  recordTrackProgressStarted(): void {
    this.trackProgressStarted.add(1);
  }

  recordSyndromeClassification(
    status: 'processed' | 'skipped' | 'failed',
  ): void {
    this.syndromeClassification.add(1, { status });
  }

  recordSyndromeClassificationDuration(durationMs: number): void {
    this.syndromeClassificationDurationMs.record(durationMs);
  }

  recordSyndromeScoreGenerated(
    syndromeCode: string,
    aboveThreshold: boolean,
  ): void {
    this.syndromeScoreGenerated.add(1, {
      syndrome_code: syndromeCode,
      above_threshold: String(aboveThreshold),
    });
  }
}
