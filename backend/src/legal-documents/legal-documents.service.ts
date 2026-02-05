import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LegalDocumentResponseDto } from './dto/legal-document-response.dto';
import { LegalDocumentTypeResponseDto } from './dto/legal-document-type-response.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';
import { CreateLegalDocumentTypeDto } from './dto/create-legal-document-type.dto';
import { UpdateLegalDocumentTypeDto } from './dto/update-legal-document-type.dto';

@Injectable()
export class LegalDocumentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca todos os documentos legais ativos (última versão de cada tipo)
   */
  async findActive(): Promise<LegalDocumentResponseDto[]> {
    // Buscar todos os tipos ativos
    const activeTypes = await this.prisma.legal_document_type.findMany({
      where: { active: true },
    });

    const results: LegalDocumentResponseDto[] = [];

    // Para cada tipo, buscar o documento ativo mais recente
    for (const type of activeTypes) {
      const document = await this.prisma.legal_document.findFirst({
        where: {
          type_id: type.id,
          active: true,
        },
        include: {
          legal_document_type: true,
        },
        orderBy: {
          effective_date: 'desc',
        },
      });

      if (document) {
        results.push(this.mapToResponseDto(document));
      }
    }

    return results;
  }

  /**
   * Busca um documento legal por ID
   */
  async findOne(id: number): Promise<LegalDocumentResponseDto> {
    const document = await this.prisma.legal_document.findUnique({
      where: { id },
      include: {
        legal_document_type: true,
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Documento legal com ID ${id} não encontrado`,
      );
    }

    return this.mapToResponseDto(document);
  }

  /**
   * Busca documento ativo por código do tipo
   */
  async findByTypeCode(typeCode: string): Promise<LegalDocumentResponseDto> {
    const type = await this.prisma.legal_document_type.findUnique({
      where: { code: typeCode },
    });

    if (!type) {
      throw new NotFoundException(
        `Tipo de documento com código ${typeCode} não encontrado`,
      );
    }

    const document = await this.prisma.legal_document.findFirst({
      where: {
        type_id: type.id,
        active: true,
      },
      include: {
        legal_document_type: true,
      },
      orderBy: {
        effective_date: 'desc',
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Nenhum documento ativo encontrado para o tipo ${typeCode}`,
      );
    }

    return this.mapToResponseDto(document);
  }

  /**
   * Valida se todos os IDs fornecidos são de documentos ativos
   */
  async validateDocumentIds(documentIds: number[]): Promise<boolean> {
    const documents = await this.prisma.legal_document.findMany({
      where: {
        id: { in: documentIds },
        active: true,
      },
    });

    if (documents.length !== documentIds.length) {
      const foundIds = documents.map((d) => d.id);
      const missingIds = documentIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Documentos inválidos ou inativos: ${missingIds.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Busca apenas documentos obrigatórios ativos
   */
  async findRequiredDocuments(): Promise<LegalDocumentResponseDto[]> {
    const requiredTypes = await this.prisma.legal_document_type.findMany({
      where: {
        is_required: true,
        active: true,
      },
    });

    const results: LegalDocumentResponseDto[] = [];

    for (const type of requiredTypes) {
      const document = await this.prisma.legal_document.findFirst({
        where: {
          type_id: type.id,
          active: true,
        },
        include: {
          legal_document_type: true,
        },
        orderBy: {
          effective_date: 'desc',
        },
      });

      if (document) {
        results.push(this.mapToResponseDto(document));
      }
    }

    return results;
  }

  /**
   * Verifica se todos os documentos obrigatórios foram aceitos
   */
  async validateRequiredDocuments(documentIds: number[]): Promise<void> {
    const requiredDocs = await this.findRequiredDocuments();
    const requiredIds = requiredDocs.map((doc) => doc.id);

    const missingRequired = requiredIds.filter(
      (id) => !documentIds.includes(id),
    );

    if (missingRequired.length > 0) {
      const missingDocs = requiredDocs.filter((doc) =>
        missingRequired.includes(doc.id),
      );
      const missingNames = missingDocs.map((doc) => doc.typeName).join(', ');
      throw new BadRequestException(
        `É obrigatório aceitar os seguintes documentos: ${missingNames}`,
      );
    }
  }

  /**
   * Lista todos os tipos de documentos legais ativos
   */
  async findAllTypes(): Promise<LegalDocumentTypeResponseDto[]> {
    const types = await this.prisma.legal_document_type.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return types.map((type) => this.mapTypeToResponseDto(type));
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Lista todos os documentos legais (admin)
   */
  async findAllDocuments(): Promise<LegalDocumentResponseDto[]> {
    const documents = await this.prisma.legal_document.findMany({
      include: {
        legal_document_type: true,
      },
      orderBy: [
        { legal_document_type: { name: 'asc' } },
        { version: 'desc' },
        { effective_date: 'desc' },
      ],
    });

    return documents.map((doc) => this.mapToResponseDto(doc));
  }

  /**
   * Lista todos os tipos de documentos legais (incluindo inativos) (admin)
   */
  async findAllTypesAdmin(): Promise<LegalDocumentTypeResponseDto[]> {
    const types = await this.prisma.legal_document_type.findMany({
      orderBy: { name: 'asc' },
    });

    return types.map((type) => this.mapTypeToResponseDto(type));
  }

  /**
   * Cria um novo documento legal (admin)
   */
  async createDocument(
    dto: CreateLegalDocumentDto,
  ): Promise<LegalDocumentResponseDto> {
    // Verificar se o tipo existe
    const type = await this.prisma.legal_document_type.findUnique({
      where: { id: dto.typeId },
    });

    if (!type) {
      throw new NotFoundException(
        `Tipo de documento com ID ${dto.typeId} não encontrado`,
      );
    }

    // Verificar se já existe um documento com essa versão e tipo
    const existing = await this.prisma.legal_document.findFirst({
      where: {
        type_id: dto.typeId,
        version: dto.version,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe um documento versão ${dto.version} para o tipo ${type.name}`,
      );
    }

    const document = await this.prisma.legal_document.create({
      data: {
        type_id: dto.typeId,
        version: dto.version,
        title: dto.title,
        content: dto.content,
        effective_date: new Date(dto.effectiveDate),
        active: dto.active ?? true,
      },
      include: {
        legal_document_type: true,
      },
    });

    return this.mapToResponseDto(document);
  }

  /**
   * Atualiza um documento legal existente (admin)
   */
  async updateDocument(
    id: number,
    dto: UpdateLegalDocumentDto,
  ): Promise<LegalDocumentResponseDto> {
    const existing = await this.prisma.legal_document.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Documento legal com ID ${id} não encontrado`,
      );
    }

    // Se está atualizando o tipo, verificar se existe
    if (dto.typeId !== undefined) {
      const type = await this.prisma.legal_document_type.findUnique({
        where: { id: dto.typeId },
      });

      if (!type) {
        throw new NotFoundException(
          `Tipo de documento com ID ${dto.typeId} não encontrado`,
        );
      }
    }

    // Verificar conflito de versão se está mudando tipo ou versão
    if (dto.typeId !== undefined || dto.version !== undefined) {
      const checkTypeId = dto.typeId ?? existing.type_id;
      const checkVersion = dto.version ?? existing.version;

      const conflict = await this.prisma.legal_document.findFirst({
        where: {
          id: { not: id },
          type_id: checkTypeId,
          version: checkVersion,
        },
      });

      if (conflict) {
        throw new ConflictException(
          `Já existe outro documento versão ${checkVersion} para este tipo`,
        );
      }
    }

    const document = await this.prisma.legal_document.update({
      where: { id },
      data: {
        ...(dto.typeId !== undefined && { type_id: dto.typeId }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.effectiveDate !== undefined && {
          effective_date: new Date(dto.effectiveDate),
        }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: {
        legal_document_type: true,
      },
    });

    return this.mapToResponseDto(document);
  }

  /**
   * Remove um documento legal (admin)
   */
  async deleteDocument(id: number): Promise<void> {
    const document = await this.prisma.legal_document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(
        `Documento legal com ID ${id} não encontrado`,
      );
    }

    // Verificar se há aceitações vinculadas
    const acceptances = await this.prisma.user_legal_acceptance.count({
      where: { legal_document_id: id },
    });

    if (acceptances > 0) {
      throw new BadRequestException(
        `Não é possível deletar este documento pois existem ${acceptances} aceitações vinculadas. Considere desativá-lo.`,
      );
    }

    await this.prisma.legal_document.delete({
      where: { id },
    });
  }

  /**
   * Cria um novo tipo de documento legal (admin)
   */
  async createDocumentType(
    dto: CreateLegalDocumentTypeDto,
  ): Promise<LegalDocumentTypeResponseDto> {
    // Verificar se já existe um tipo com esse código
    const existing = await this.prisma.legal_document_type.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe um tipo de documento com o código ${dto.code}`,
      );
    }

    const type = await this.prisma.legal_document_type.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        is_required: dto.isRequired ?? false,
        active: dto.active ?? true,
      },
    });

    return this.mapTypeToResponseDto(type);
  }

  /**
   * Atualiza um tipo de documento legal (admin)
   */
  async updateDocumentType(
    id: number,
    dto: UpdateLegalDocumentTypeDto,
  ): Promise<LegalDocumentTypeResponseDto> {
    const existing = await this.prisma.legal_document_type.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Tipo de documento com ID ${id} não encontrado`,
      );
    }

    const type = await this.prisma.legal_document_type.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isRequired !== undefined && { is_required: dto.isRequired }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });

    return this.mapTypeToResponseDto(type);
  }

  /**
   * Busca um tipo por ID (admin)
   */
  async findOneType(id: number): Promise<LegalDocumentTypeResponseDto> {
    const type = await this.prisma.legal_document_type.findUnique({
      where: { id },
    });

    if (!type) {
      throw new NotFoundException(
        `Tipo de documento com ID ${id} não encontrado`,
      );
    }

    return this.mapTypeToResponseDto(type);
  }

  /**
   * Remove um tipo de documento legal (admin)
   */
  async deleteDocumentType(id: number): Promise<void> {
    const type = await this.prisma.legal_document_type.findUnique({
      where: { id },
    });

    if (!type) {
      throw new NotFoundException(
        `Tipo de documento com ID ${id} não encontrado`,
      );
    }

    // Verificar se há documentos vinculados
    const documents = await this.prisma.legal_document.count({
      where: { type_id: id },
    });

    if (documents > 0) {
      throw new BadRequestException(
        `Não é possível deletar este tipo pois existem ${documents} documentos vinculados. Considere desativá-lo.`,
      );
    }

    await this.prisma.legal_document_type.delete({
      where: { id },
    });
  }

  private mapToResponseDto(document: any): LegalDocumentResponseDto {
    return {
      id: document.id,
      typeId: document.type_id,
      typeCode: document.legal_document_type.code,
      typeName: document.legal_document_type.name,
      isRequired: document.legal_document_type.is_required,
      version: document.version,
      title: document.title,
      content: document.content,
      effectiveDate: document.effective_date.toISOString().split('T')[0],
      active: document.active,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    };
  }

  private mapTypeToResponseDto(type: any): LegalDocumentTypeResponseDto {
    return {
      id: type.id,
      code: type.code,
      name: type.name,
      description: type.description,
      isRequired: type.is_required,
      active: type.active,
      createdAt: type.created_at,
      updatedAt: type.updated_at,
    };
  }
}
