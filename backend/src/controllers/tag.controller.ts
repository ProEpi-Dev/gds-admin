import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const TagController = {
  async create(req, res) {
    try {
      const { name, color, description } = req.body;

      const tag = await prisma.tag.create({
        data: { name, color, description, active: true },
      });

      return res.json(tag);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar tag' });
    }
  },

  async list(req, res) {
    try {
      const tags = await prisma.tag.findMany({
        where: { active: true },
      });

      return res.json(tags);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar tags' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, color, description } = req.body;

      const tag = await prisma.tag.update({
        where: { id: Number(id) },
        data: { name, color, description },
      });

      return res.json(tag);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar tag' });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.tag.update({
        where: { id: Number(id) },
        data: { active: false },
      });

      return res.json({ message: 'Tag desativada' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao remover tag' });
    }
  },
};
