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

type EmailProvider = 'smtp' | 'brevo';

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
  private transporter: Transporter | null = null;
  private readonly provider: EmailProvider;
  private readonly from: string;
  private readonly frontendUrl: string;
  private readonly brevoApiKey: string | undefined;
  private readonly brevoSenderEmail: string | undefined;
  private readonly brevoSenderName: string;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<EmailProvider>('EMAIL_PROVIDER', 'smtp');
    this.from = this.config.get('SMTP_FROM', '');
    this.frontendUrl = this.config.getOrThrow('FRONTEND_URL');
    this.brevoApiKey = this.config.get<string>('BREVO_API_KEY');
    this.brevoSenderEmail = this.config.get<string>('BREVO_SENDER_EMAIL');
    this.brevoSenderName = this.config.get<string>('BREVO_SENDER_NAME', 'Quiniela FWC 2026');
  }

  async onModuleInit(): Promise<void> {
    if (this.provider === 'brevo') {
      if (!this.brevoApiKey || !this.brevoSenderEmail) {
        throw new Error('BREVO_API_KEY and BREVO_SENDER_EMAIL are required when EMAIL_PROVIDER=brevo');
      }
      this.logger.log(`Email provider: Brevo (sender: ${this.brevoSenderEmail})`);
      return;
    }

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
    this.logger.log('Email provider: SMTP');
  }

  async sendStageActivation(
    stage: MatchStage,
    recipients: Recipient[],
    leadMinutes: number,
  ): Promise<void> {
    const label = STAGE_LABELS[stage];
    const window = this.formatLeadWindow(leadMinutes);
    const url = `${this.frontendUrl}${STAGE_URLS[stage]}`;

    await this.sendBatch(
      recipients,
      `🏆 ¡${label} abierta! — Quiniela FWC 2026`,
      (name) => this.activationHtml(name, label, window, url),
    );
  }

  async sendStageReminder(
    stage: MatchStage,
    recipients: Recipient[],
    leadMinutes: number,
  ): Promise<void> {
    const label = STAGE_LABELS[stage];
    const window = this.formatLeadWindow(leadMinutes);
    const url = `${this.frontendUrl}${STAGE_URLS[stage]}`;

    await this.sendBatch(
      recipients,
      `⏰ ${label} arranca pronto — Quiniela FWC 2026`,
      (name) => this.reminderHtml(name, label, window, url),
    );
  }

  async sendTestEmail(to: string): Promise<void> {
    const subject = this.provider === 'brevo'
      ? '✅ Test Brevo — Quiniela FWC 2026'
      : '✅ Test SMTP — Quiniela FWC 2026';
    const html = `<p>El transporte de email (${this.provider.toUpperCase()}) funciona correctamente.</p>`;

    await this.sendMail(to, subject, html);
    this.logger.log(`Test email sent to ${to} via ${this.provider}`);
  }

  private async sendBatch(
    recipients: Recipient[],
    subject: string,
    htmlFn: (name: string) => string,
  ): Promise<void> {
    for (const { email, name } of recipients) {
      try {
        await this.sendMail(email, subject, htmlFn(name));
      } catch (err) {
        this.logger.error(`Failed to send to ${email}`, err);
      }
    }
    this.logger.log(`Sent ${recipients.length} emails — "${subject}"`);
  }

  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (this.provider === 'brevo') {
      await this.sendViaBrevo(to, subject, html);
      return;
    }

    await this.transporter!.sendMail({ from: this.from, to, subject, html });
  }

  private async sendViaBrevo(to: string, subject: string, html: string): Promise<void> {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.brevoApiKey!,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.brevoSenderName, email: this.brevoSenderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Brevo API error ${response.status}: ${body}`);
    }
  }

  /** Human phrase for the per-match window, e.g. "hasta 1 hora antes de cada partido". */
  private formatLeadWindow(leadMinutes: number): string {
    if (leadMinutes <= 0) return 'hasta el inicio de cada partido';
    const h = Math.floor(leadMinutes / 60);
    const m = leadMinutes % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} ${h === 1 ? 'hora' : 'horas'}`);
    if (m > 0) parts.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);
    return `hasta ${parts.join(' y ')} antes de cada partido`;
  }

  private activationHtml(name: string, label: string, window: string, url: string): string {
    return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="color:#1a1a1a">¡Hola, ${name}! 🏆</h1>
        <p style="font-size:16px;color:#333">
          Los pronósticos de <strong>${label}</strong> ya están abiertos.
          Puedes guardar todos de una vez o poco a poco.
        </p>
        <p style="font-size:16px;color:#333">
          <strong>Ahora puedes ingresar o modificar tus resultados ${window}.</strong>
          Cada partido cierra por su cuenta, así que no tienes que hacerlos todos juntos.
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

  private reminderHtml(name: string, label: string, window: string, url: string): string {
    return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="color:#1a1a1a">¡${label} arranca pronto, ${name}! ⏰</h1>
        <p style="font-size:16px;color:#333">
          Recuerda que puedes ingresar o modificar tus pronósticos de
          <strong>${label}</strong> ${window}.
        </p>
        <p style="font-size:16px;color:#333">
          Si aún te faltan partidos por pronosticar, ¡entra ahora antes de que empiecen!
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
