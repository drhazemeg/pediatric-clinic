import { createTransport } from 'nodemailer';
import { z } from 'zod';

import { logger } from '#/server/logger.ts';
import { env } from '@/env/server';

import { recordBounce } from './bounce';

const smtpPort = env.SMTP_PORT > 0 ? env.SMTP_PORT : 587;

const transporter = createTransport({
  host: env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const subjects: Record<SendOtpEmailProps['type'], string> = {
  'email-verification': 'Smart Clinic — Verify Your Email',
  'forget-password': 'Smart Clinic — Reset Your Password',
};

const messages: Record<SendOtpEmailProps['type'], string> = {
  'email-verification':
    'Use the verification code below to confirm your Smart Clinic account email:',
  'forget-password':
    'Use the verification code below to reset your Smart Clinic password:',
};

export interface SendOtpEmailProps {
  to: string;
  otp: string;
  type: 'email-verification' | 'forget-password';
}

const smtpErrorSchema = z.object({
  responseCode: z.number().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export async function sendOtpEmail({ to, otp, type }: SendOtpEmailProps) {
  const subject = subjects[type];
  const message = messages[type];
  const safeOtp = escapeHtml(otp);
  const safeMessage = escapeHtml(message);

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text: `${message}\n\nVerification Code: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.\n\nSmart Clinic — Dr. Hazem Ali (Pediatric & Lactation Care, Hurghada)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 440px; margin: 0 auto; padding: 24px; color: #111827;">
          <div style="margin-bottom: 16px;">
            <h2 style="margin: 0; color: #0f766e; font-size: 20px;">Smart Clinic</h2>
            <p style="margin: 4px 0 0; color: #4b5563; font-size: 13px;">Dr. Hazem Ali — Pediatric &amp; Lactation Care (Hurghada)</p>
          </div>
          <p style="font-size: 14px; line-height: 1.5; margin: 16px 0;">${safeMessage}</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">${safeOtp}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
            This code expires in 5 minutes. Do not share it with anyone.
          </p>
        </div>
      `,
    });
  } catch (error_) {
    const parsedError = smtpErrorSchema.safeParse(error_);

    if (
      parsedError.success &&
      parsedError.data.responseCode !== undefined &&
      parsedError.data.responseCode >= 400
    ) {
      const { responseCode, code, message: errorMessage } = parsedError.data;
      logger.warn('[SMTP] Rejection detected, recording bounce', {
        to,
        responseCode,
        code,
      });
      await recordBounce(
        to,
        `SMTP ${responseCode}: ${errorMessage ?? code ?? 'unknown'}`,
      );
    }

    throw error_;
  }
}
