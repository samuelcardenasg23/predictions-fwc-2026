import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface Recipient {
  email: string;
  name: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.getOrThrow('RESEND_API_KEY'));
    this.from = this.config.getOrThrow('RESEND_FROM_EMAIL');
    this.frontendUrl = this.config.getOrThrow('FRONTEND_URL');
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

  private async sendBatch(
    recipients: Recipient[],
    subject: string,
    htmlFn: (name: string) => string,
  ): Promise<void> {
    // Resend batch: up to 100 emails per call
    const BATCH_SIZE = 100;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE).map(({ email, name }) => ({
        from: this.from,
        to: email,
        subject,
        html: htmlFn(name),
      }));

      const { error } = await this.resend.batch.send(batch);
      if (error) {
        this.logger.error('Resend batch error', error);
      } else {
        this.logger.log(`Sent ${batch.length} emails — "${subject}"`);
      }
    }
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
