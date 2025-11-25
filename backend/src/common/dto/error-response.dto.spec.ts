import { ErrorResponseDto, ErrorDetailDto } from './error-response.dto';

describe('ErrorResponseDto', () => {
  describe('ErrorDetailDto', () => {
    it('deve criar ErrorDetailDto com code e message', () => {
      const errorDetail = new ErrorDetailDto();
      errorDetail.code = 'VALIDATION_ERROR';
      errorDetail.message = 'Invalid input data';

      expect(errorDetail.code).toBe('VALIDATION_ERROR');
      expect(errorDetail.message).toBe('Invalid input data');
    });

    it('deve permitir details opcional', () => {
      const errorDetail = new ErrorDetailDto();
      errorDetail.code = 'ERROR';
      errorDetail.message = 'Error message';
      errorDetail.details = ['Detail 1', 'Detail 2'];

      expect(errorDetail.details).toEqual(['Detail 1', 'Detail 2']);
    });
  });

  describe('ErrorResponseDto', () => {
    it('deve criar ErrorResponseDto com error', () => {
      const errorResponse = new ErrorResponseDto();
      const errorDetail = new ErrorDetailDto();
      errorDetail.code = 'ERROR';
      errorDetail.message = 'Error message';
      errorResponse.error = errorDetail;

      expect(errorResponse.error).toBe(errorDetail);
      expect(errorResponse.error.code).toBe('ERROR');
      expect(errorResponse.error.message).toBe('Error message');
    });
  });
});

