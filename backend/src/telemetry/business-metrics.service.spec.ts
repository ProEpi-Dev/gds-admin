import { BusinessMetricsService } from './business-metrics.service';

describe('BusinessMetricsService', () => {
  let service: BusinessMetricsService;

  beforeEach(() => {
    service = new BusinessMetricsService();
  });

  it('recordParticipationCreated não lança', () => {
    expect(() => service.recordParticipationCreated()).not.toThrow();
  });

  it('recordQuizSubmissionCreated cobre passed true, false e null', () => {
    expect(() =>
      service.recordQuizSubmissionCreated({
        completed: true,
        passed: true,
      }),
    ).not.toThrow();
    expect(() =>
      service.recordQuizSubmissionCreated({
        completed: true,
        passed: false,
      }),
    ).not.toThrow();
    expect(() =>
      service.recordQuizSubmissionCreated({
        completed: false,
        passed: null,
      }),
    ).not.toThrow();
  });

  it('recordReportCreated com e sem channel', () => {
    expect(() => service.recordReportCreated('POSITIVE')).not.toThrow();
    expect(() =>
      service.recordReportCreated('NEGATIVE', 'web'),
    ).not.toThrow();
  });

  it('recordAuthLogin success e failure', () => {
    expect(() => service.recordAuthLogin('success')).not.toThrow();
    expect(() => service.recordAuthLogin('failure')).not.toThrow();
  });

  it('recordAuthSignupCompleted e recordTrackProgressStarted', () => {
    expect(() => service.recordAuthSignupCompleted()).not.toThrow();
    expect(() => service.recordTrackProgressStarted()).not.toThrow();
  });

  it('métricas sindrômicas não lançam', () => {
    expect(() =>
      service.recordSyndromeClassification('processed'),
    ).not.toThrow();
    expect(() => service.recordSyndromeClassification('skipped')).not.toThrow();
    expect(() => service.recordSyndromeClassification('failed')).not.toThrow();
    expect(() => service.recordSyndromeClassificationDuration(42)).not.toThrow();
    expect(() =>
      service.recordSyndromeScoreGenerated('diarreica', true),
    ).not.toThrow();
    expect(() =>
      service.recordSyndromeScoreGenerated('exantematica', false),
    ).not.toThrow();
  });
});
