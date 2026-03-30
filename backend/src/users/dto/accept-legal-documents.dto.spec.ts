import { validate } from 'class-validator';
import { AcceptLegalDocumentsDto } from './accept-legal-documents.dto';

describe('AcceptLegalDocumentsDto', () => {
  it('aceita legalDocumentIds válidos', async () => {
    const dto = Object.assign(new AcceptLegalDocumentsDto(), {
      legalDocumentIds: [1, 2],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('rejeita array vazio (ArrayMinSize)', async () => {
    const dto = Object.assign(new AcceptLegalDocumentsDto(), {
      legalDocumentIds: [],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
