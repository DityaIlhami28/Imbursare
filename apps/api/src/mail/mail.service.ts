import { Injectable, Logger } from '@nestjs/common';

/**
 * Sends transactional auth emails. This is the single swap point for a real
 * provider (Resend/SendGrid/SMTP): today it logs the link to the server console
 * (dev fallback) so the invite/reset flows are fully usable without email infra.
 * Replace the bodies of `sendInviteEmail` / `sendPasswordResetEmail` with a real
 * client and nothing else in the app needs to change.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendInviteEmail(email: string, link: string): Promise<void> {
    this.logger.log(`[invite] ${email} -> set your password: ${link}`);
  }

  async sendPasswordResetEmail(email: string, link: string): Promise<void> {
    this.logger.log(`[reset] ${email} -> reset your password: ${link}`);
  }
}
