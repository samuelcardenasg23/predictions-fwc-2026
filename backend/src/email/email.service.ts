import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface Recipient {
  email: string;
  name: string;
}

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

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.config.getOrThrow('SMTP_USER'),
        pass: this.config.getOrThrow('SMTP_PASS'),
      },
      tls: { ciphers: 'SSLv3' },
    });
  }

  async sendKnockoutActivation(recipients: Recipient[], deadline: Date): Promise<void> {
    const deadlineStr = deadline.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City',
    });

    await this.sendBatch(
      recipients,
      '🏆 ¡La fase eliminatoria ya está abierta! — Quiniela FWC 2026',
      (name) => this.knockoutActivationHtml(name, deadlineStr),
    );
  }

  async sendKnockoutReminder(recipients: Recipient[], deadline: Date): Promise<void> {
    const deadlineStr = deadline.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City',
    });

    await this.sendBatch(
      recipients,
      '⏰ Recordatorio: 24h para cerrar pronósticos eliminatoria — Quiniela FWC 2026',
      (name) => this.reminderHtml(name, deadlineStr),
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
        await this.transporter.sendMail({
          from: this.from,
          to: email,
          subject,
          html: htmlFn(name),
        });
      } catch (err) {
        this.logger.error(`Failed to send to ${email}`, err);
      }
    }
    this.logger.log(`Sent ${recipients.length} emails — "${subject}"`);
  }

  private knockoutActivationHtml(name: string, deadline: string): string {
    return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="color:#1a1a1a">¡Hola, ${name}! 🏆</h1>
        <p style="font-size:16px;color:#333">
          La fase eliminatoria del Mundial 2026 ya está lista. Los 32 partidos de
          playoff están disponibles para que hagas tus pronósticos.
        </p>
        <p style="font-size:16px;color:#333">
          <strong>Tienes hasta el ${deadline} (hora Ciudad de México)</strong> para
          registrar tus predicciones antes de que empiece el primer partido.
        </p>
        <a href="${this.frontendUrl}/predictions/knockout"
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

  private reminderHtml(name: string, deadline: string): string {
    return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="color:#1a1a1a">¡Últimas 24 horas, ${name}! ⏰</h1>
        <p style="font-size:16px;color:#333">
          El tiempo se acaba. Los pronósticos de la fase eliminatoria cierran el
          <strong>${deadline} (hora Ciudad de México)</strong>.
        </p>
        <p style="font-size:16px;color:#333">
          Si aún te faltan partidos por pronosticar, ¡entra ahora antes de que sea tarde!
        </p>
        <a href="${this.frontendUrl}/predictions/knockout"
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
