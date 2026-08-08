import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type MaintenanceMode = 'banner' | 'read_only' | 'full';

export interface ActiveMaintenanceWindow {
  mode: MaintenanceMode;
  title: unknown;
  message: unknown;
  startsAt: Date;
  endsAt: Date | null;
}

type MaintenanceWindowRow = {
  mode: string;
  title: unknown;
  message: unknown;
  starts_at: Date;
  ends_at: Date | null;
};

@Injectable()
export class MaintenanceService {
  /**
   * O guard consulta a janela em toda requisição, então o resultado fica em
   * cache. O atraso de propagação é aceitável: a janela é operada com
   * antecedência, não em tempo real.
   */
  private static readonly CACHE_TTL_MS = 15_000;

  private static readonly SEVERITY: Record<MaintenanceMode, number> = {
    banner: 1,
    read_only: 2,
    full: 3,
  };

  private static readonly FALLBACK_LOCALE = 'pt';
  private static readonly SUPPORTED_LOCALES = ['pt', 'en', 'es'];

  private cached: ActiveMaintenanceWindow | null = null;
  private cacheExpiresAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async getActiveWindow(
    now: Date = new Date(),
  ): Promise<ActiveMaintenanceWindow | null> {
    if (now.getTime() < this.cacheExpiresAt) {
      return this.cached;
    }

    const window = await this.loadActiveWindow(now);
    this.cached = window;
    this.cacheExpiresAt = MaintenanceService.resolveCacheExpiry(window, now);
    return window;
  }

  /** Usado pelo CRUD: alteração de janela deve valer sem esperar o TTL. */
  invalidateCache(): void {
    this.cached = null;
    this.cacheExpiresAt = 0;
  }

  resolveText(value: unknown, acceptLanguage?: string): string {
    const map = MaintenanceService.asLocaleMap(value);
    if (!map) {
      return '';
    }

    const preferred = MaintenanceService.parseAcceptLanguage(acceptLanguage);
    for (const locale of [...preferred, MaintenanceService.FALLBACK_LOCALE]) {
      const text = map[locale];
      if (typeof text === 'string' && text.length > 0) {
        return text;
      }
    }
    return '';
  }

  private async loadActiveWindow(
    now: Date,
  ): Promise<ActiveMaintenanceWindow | null> {
    const rows = (await this.prisma.maintenance_window.findMany({
      where: {
        active: true,
        starts_at: { lte: now },
        OR: [{ ends_at: null }, { ends_at: { gt: now } }],
      },
    })) as MaintenanceWindowRow[];

    return MaintenanceService.pickMostSevere(rows);
  }

  /** Janelas sobrepostas: vence a mais restritiva; empate, a que começou antes. */
  private static pickMostSevere(
    rows: MaintenanceWindowRow[],
  ): ActiveMaintenanceWindow | null {
    let chosen: MaintenanceWindowRow | null = null;

    for (const row of rows) {
      if (!chosen || MaintenanceService.outranks(row, chosen)) {
        chosen = row;
      }
    }

    return chosen ? MaintenanceService.toActiveWindow(chosen) : null;
  }

  private static outranks(
    candidate: MaintenanceWindowRow,
    current: MaintenanceWindowRow,
  ): boolean {
    const candidateRank = MaintenanceService.severityOf(candidate.mode);
    const currentRank = MaintenanceService.severityOf(current.mode);

    if (candidateRank !== currentRank) {
      return candidateRank > currentRank;
    }
    return candidate.starts_at.getTime() < current.starts_at.getTime();
  }

  private static severityOf(mode: string): number {
    return MaintenanceService.SEVERITY[mode as MaintenanceMode] ?? 0;
  }

  private static toActiveWindow(
    row: MaintenanceWindowRow,
  ): ActiveMaintenanceWindow {
    return {
      mode: row.mode as MaintenanceMode,
      title: row.title,
      message: row.message,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    };
  }

  /**
   * Nunca estender o cache além do fim da janela — caso contrário o bloqueio
   * sobreviveria ao horário anunciado, que é o erro mais visível para o usuário.
   */
  private static resolveCacheExpiry(
    window: ActiveMaintenanceWindow | null,
    now: Date,
  ): number {
    const ttlExpiry = now.getTime() + MaintenanceService.CACHE_TTL_MS;
    if (!window?.endsAt) {
      return ttlExpiry;
    }
    return Math.min(ttlExpiry, window.endsAt.getTime());
  }

  private static asLocaleMap(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  /** Ordem do header basta na prática; pesos `q` não são interpretados. */
  private static parseAcceptLanguage(header?: string): string[] {
    if (!header) {
      return [];
    }

    return header
      .split(',')
      .map((part) => part.split(';')[0].trim().toLowerCase().split('-')[0])
      .filter((lang) => MaintenanceService.SUPPORTED_LOCALES.includes(lang));
  }
}
