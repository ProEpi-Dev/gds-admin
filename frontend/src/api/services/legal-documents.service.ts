import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type { LegalDocument, LegalDocumentType } from "../../types/legal-document.types";

export const legalDocumentsService = {
  async findActive(): Promise<LegalDocument[]> {
    const response = await apiClient.get(API_ENDPOINTS.LEGAL_DOCUMENTS.ACTIVE);
    return response.data;
  },

  async findOne(id: number): Promise<LegalDocument> {
    const response = await apiClient.get(API_ENDPOINTS.LEGAL_DOCUMENTS.DETAIL(id));
    return response.data;
  },

  async findByTypeCode(typeCode: string): Promise<LegalDocument> {
    const response = await apiClient.get(API_ENDPOINTS.LEGAL_DOCUMENTS.BY_TYPE(typeCode));
    return response.data;
  },

  async findTypes(): Promise<LegalDocumentType[]> {
    const response = await apiClient.get(API_ENDPOINTS.LEGAL_DOCUMENTS.TYPES);
    return response.data;
  },
};
