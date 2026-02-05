import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  async getHealth() {
    let databaseStatus = 'disconnected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch (error) {
      databaseStatus = 'error';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // em segundos
    };
  }
}
