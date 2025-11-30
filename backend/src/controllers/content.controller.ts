import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const ContentController = {
  // Criar conteúdo
  async create(req, res) {
    try {
      const {
        title,
        reference,
        content,
        summary,
        slug,
        author_id,
        context_id,
        tags,
      } = req.body;

      const newContent = await prisma.content.create({
        data: {
          title,
          reference,
          content,
          summary,
          slug,
          active: true,
          author_id,
          context_id,
          content_tag: tags
            ? {
                create: tags.map((tagId: number) => ({
                  tag: { connect: { id: tagId } },
                })),
              }
            : undefined,
        },
        include: { content_tag: true },
      });

      return res.json(newContent);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Erro ao criar conteúdo' });
    }
  },

  // Listar todos
  async list(req, res) {
    try {
      const content = await prisma.content.findMany({
        where: { active: true },
        include: { content_tag: true },
      });
      return res.json(content);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar conteúdos' });
    }
  },

  // Filtro por contexto
  async listByContext(req, res) {
    try {
      const { contextId } = req.params;

      const content = await prisma.content.findMany({
        where: {
          context_id: Number(contextId),
          active: true,
        },
        include: { content_tag: true },
      });

      return res.json(content);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao filtrar conteúdos' });
    }
  },

  // Buscar por ID
  async get(req, res) {
    try {
      const { id } = req.params;

      const content = await prisma.content.findUnique({
        where: { id: Number(id) },
        include: { content_tag: true },
      });

      return res.json(content);
    } catch {
      return res.status(500).json({ error: 'Erro ao buscar conteúdo' });
    }
  },

  // Atualizar
  async update(req, res) {
    try {
      const { id } = req.params;
      const { title, content, summary, slug, context_id, tags } = req.body;

      const updated = await prisma.content.update({
        where: { id: Number(id) },
        data: {
          title,
          content,
          summary,
          slug,
          context_id,
          updated_at: new Date(),
          content_tag: tags
            ? {
                deleteMany: {},
                create: tags.map((tagId: number) => ({
                  tag: { connect: { id: tagId } },
                })),
              }
            : undefined,
        },
        include: { content_tag: true },
      });

      return res.json(updated);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Erro ao atualizar conteúdo' });
    }
  },

  // Remover (soft delete)
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.content.update({
        where: { id: Number(id) },
        data: { active: false },
      });

      return res.json({ message: 'Conteúdo desativado' });
    } catch {
      return res.status(500).json({ error: 'Erro ao remover conteúdo' });
    }
  },
};
