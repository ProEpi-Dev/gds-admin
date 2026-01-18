import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type {
  LegalDocument,
  LegalDocumentType,
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  CreateLegalDocumentTypeDto,
  UpdateLegalDocumentTypeDto,
} from "../../types/legal-document.types";

export const LegalDocumentsAdminService = {
  // ============ DOCUMENTS ============

  async findAllDocuments(): Promise<LegalDocument[]> {
    const response = await apiClient.get(API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.LIST);
    return response.data;
  },

  async findOneDocument(id: number): Promise<LegalDocument> {
    const response = await apiClient.get(API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.DETAIL(id));
    return response.data;
  },

  async createDocument(
    data: CreateLegalDocumentDto
  ): Promise<LegalDocument> {
    const response = await apiClient.post(API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.CREATE, data);
    return response.data;
  },

  async updateDocument(
    id: number,
    data: UpdateLegalDocumentDto
  ): Promise<LegalDocument> {
    const response = await apiClient.put(API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.UPDATE(id), data);
    return response.data;
  },

  async deleteDocument(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.DELETE(id));
  },

  // ============ DOCUMENT TYPES ============

  async findAllTypes(): Promise<LegalDocumentType[]> {
    const response = await apiClient.get(API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.TYPES_ALL);
    return response.data;
  },

  async findOneType(id: number): Promise<LegalDocumentType> {
    const response = await apiClient.get(API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.TYPE_DETAIL(id));
    return response.data;
  },

  async createType(
    data: CreateLegalDocumentTypeDto
  ): Promise<LegalDocumentType> {
    const response = await apiClient.post(
      API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.TYPE_CREATE,
      data
    );
    return response.data;
  },

  async updateType(
    id: number,
    data: UpdateLegalDocumentTypeDto
  ): Promise<LegalDocumentType> {
    const response = await apiClient.put(
      API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.TYPE_UPDATE(id),
      data
    );
    return response.data;
  },

  async deleteType(id: number): Promise<void> {
    await apiClient.delete(
      API_ENDPOINTS.LEGAL_DOCUMENTS_ADMIN.TYPE_DELETE(id)
    );
  },
};
