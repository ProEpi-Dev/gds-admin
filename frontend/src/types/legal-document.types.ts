export interface LegalDocumentType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocument {
  id: number;
  typeId: number;
  typeCode: string;
  typeName: string;
  isRequired: boolean;
  version: string;
  title: string;
  content: string;
  effectiveDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ ADMIN TYPES ============

export interface CreateLegalDocumentDto {
  typeId: number;
  version: string;
  title: string;
  content: string;
  effectiveDate: string;
  active?: boolean;
}

export interface UpdateLegalDocumentDto {
  typeId?: number;
  version?: string;
  title?: string;
  content?: string;
  effectiveDate?: string;
  active?: boolean;
}

export interface CreateLegalDocumentTypeDto {
  code: string;
  name: string;
  description?: string;
  isRequired?: boolean;
  active?: boolean;
}

export interface UpdateLegalDocumentTypeDto {
  name?: string;
  description?: string;
  isRequired?: boolean;
  active?: boolean;
}
