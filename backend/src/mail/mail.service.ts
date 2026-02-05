import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class MailService {
  private transporter: Transporter | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAILER_SMTP_ADDRESS');
    const user = this.configService.get<string>('MAILER_EMAIL');
    const pass = this.configService.get<string>('MAILER_PASSWORD');
    const port = this.configService.get<number>('MAILER_SMTP_PORT') ?? 587;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error(
        'Mailer not configured. Set MAILER_SMTP_ADDRESS, MAILER_EMAIL and MAILER_PASSWORD.',
      );
    }

    const from = this.configService.get<string>('MAILER_EMAIL') ?? options.to;
    const text = options.text ?? (options.html ? undefined : '');
    const html = options.html ?? undefined;

    await this.transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: text || undefined,
      html,
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }
}
