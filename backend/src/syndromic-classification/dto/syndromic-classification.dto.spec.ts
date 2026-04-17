import { plainToInstance } from 'class-transformer';
import {
  DailySyndromeCountsQueryDto,
  ReportSyndromeScoresQueryDto,
} from './syndromic-classification.dto';

describe('SyndromicClassification DTOs', () => {
  describe('ReportSyndromeScoresQueryDto', () => {
    it('transforma isAboveThreshold de string para boolean', () => {
      const plain = { page: '1', pageSize: '20', isAboveThreshold: 'true' };
      const dto = plainToInstance(ReportSyndromeScoresQueryDto, plain);
      expect(dto.isAboveThreshold).toBe(true);

      const dtoFalse = plainToInstance(ReportSyndromeScoresQueryDto, {
        isAboveThreshold: 'false',
      });
      expect(dtoFalse.isAboveThreshold).toBe(false);
    });

    it('transforma onlyLatest de string para boolean', () => {
      const dto = plainToInstance(ReportSyndromeScoresQueryDto, {
        onlyLatest: 'false',
      });
      expect(dto.onlyLatest).toBe(false);
    });
  });

  describe('DailySyndromeCountsQueryDto', () => {
    it('transforma syndromeIds a partir de string CSV', () => {
      const dto = plainToInstance(DailySyndromeCountsQueryDto, {
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        syndromeIds: '1, 2, 3',
      });
      expect(dto.syndromeIds).toEqual([1, 2, 3]);
    });

    it('transforma syndromeIds a partir de array de strings', () => {
      const dto = plainToInstance(DailySyndromeCountsQueryDto, {
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        syndromeIds: ['5', '6'],
      });
      expect(dto.syndromeIds).toEqual([5, 6]);
    });

    it('transforma onlyAboveThreshold string para boolean', () => {
      const dto = plainToInstance(DailySyndromeCountsQueryDto, {
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        onlyAboveThreshold: 'false',
      });
      expect(dto.onlyAboveThreshold).toBe(false);
    });
  });
});
