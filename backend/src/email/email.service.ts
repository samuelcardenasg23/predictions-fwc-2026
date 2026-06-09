import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as dns } from 'dns';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { MatchStage } from '@prisma/client';

interface Recipient {
  email: string;
  name: string;
}

const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: 'Fase de Grupos',
  R32: 'Fase de 32',
  R16: 'Octavos de Final',
  QF: 'Cuartos de Final',
  SF: 'Semifinales',
  THIRD_PLACE: 'Tercer y Cuarto Puesto',
  FINAL: 'Final',
};

const STAGE_URLS: Record<MatchStage, string> = {
  GROUP: '/predictions',
  R32: '/predictions/knockout/r32',
  R16: '/predictions/knockout/r16',
  QF: '/predictions/knockout/qf',
  SF: '/predictions/knockout/sf',
  THIRD_PLACE: '/predictions/knockout/third-place',
  FINAL: '/predictions/knockout/final',
};

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.getOrThrow('SMTP_FROM');
    this.frontendUrl = this.config.getOrThrow('FRONTEND_URL');
  }

  async onModuleInit(): Promise<void> {
    const smtpHost = this.config.getOrThrow<string>('SMTP_HOST');
    const [ipv4] = await dns.resolve4(smtpHost);

    this.transporter = nodemailer.createTransport({
      host: ipv4,
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.config.getOrThrow('SMTP_USER'),
        pass: this.config.getOrThrow('SMTP_PASS'),
      },
      tls: { ciphers: 'SSLv3', servername: smtpHost },
    });
  }

  async sendStageActivation(stage: MatchStage, recipients: Recipient[], deadline: Date): Promise<void> {
    const label = STAGE_LABELS[stage];
    const deadlineStr = this.formatDate(deadline);
    const url = `${this.frontendUrl}${STAGE_URLS[stage]}`;

    await this.sendBatch(
      recipients,
      `🏆 ¡${label} abierta! — Quiniela FWC 2026`,
      (name) => this.activationHtml(name, label, deadlineStr, url),
    );
  }

  async sendStageReminder(stage: MatchStage, recipients: Recipient[], deadline: Date): Promise<void> {
    const label = STAGE_LABELS[stage];
    const deadlineStr = this.formatDate(deadline);
    const url = `${this.frontendUrl}${STAGE_URLS[stage]}`;

    await this.sendBatch(
      recipients,
      `⏰ Recordatorio: 24h para cerrar ${label} — Quiniela FWC 2026`,
      (name) => this.reminderHtml(name, label, deadlineStr, url),
    );
  }

  async sendTestEmail(to: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: '✅ Test SMTP — Quiniela FWC 2026',
      html: '<p>El transporte SMTP funciona correctamente.</p>',
    });
    this.logger.log(`Test email sent to ${to}`);
  }

  private async sendBatch(
    recipients: Recipient[],
    subject: string,
    htmlFn: (name: string) => string,
  ): Promise<void> {
    for (const { email, name } of recipients) {
      try {
        await this.transporter.sendMail({ from: this.from, to: email, subject, html: htmlFn(name) });
      } catch (err) {
        this.logger.error(`Failed to send to ${email}`, err);
      }
    }
    this.logger.log(`Sent ${recipients.length} emails — "${subject}"`);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota',
    });
  }

  private activationHtml(name: string, label: string, deadline: string, url: string): string {
    return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="color:#1a1a1a">¡Hola, ${name}! 🏆</h1>
        <p style="font-size:16px;color:#333">
          Los pronósticos de <strong>${label}</strong> ya están abiertos.
          Entra y registra tus predicciones antes de que arranquen los partidos.
        </p>
        <p style="font-size:16px;color:#333">
          <strong>Fecha límite: ${deadline} (hora Colombia)</strong>
        </p>
        <a href="${url}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;
                  background:#1d4ed8;color:#fff;border-radius:8px;
                  text-decoration:none;font-weight:bold">
          Hacer mis pronósticos →
        </a>
        <p style="margin-top:32px;font-size:13px;color:#888">
          Quiniela FWC 2026 · No respondas a este correo.
        </p>
      </div>
    `;
  }

  private reminderHtml(name: string, label: string, deadline: string, url: string): string {
    return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="color:#1a1a1a">¡Últimas 24 horas, ${name}! ⏰</h1>
        <p style="font-size:16px;color:#333">
          Los pronósticos de <strong>${label}</strong> cierran el
          <strong>${deadline} (hora Colombia)</strong>.
        </p>
        <p style="font-size:16px;color:#333">
          Si aún te faltan partidos por pronosticar, ¡entra ahora!
        </p>
        <a href="${url}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;
                  background:#dc2626;color:#fff;border-radius:8px;
                  text-decoration:none;font-weight:bold">
          Completar pronósticos →
        </a>
        <p style="margin-top:32px;font-size:13px;color:#888">
          Quiniela FWC 2026 · No respondas a este correo.
        </p>
      </div>
    `;
  }
}
