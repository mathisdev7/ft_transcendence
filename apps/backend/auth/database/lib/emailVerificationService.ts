import { db } from "../init";

export interface EmailVerificationCode {
  id: number;
  user_id: number;
  email: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export function generateEmailVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createEmailVerificationCode(
  userId: number,
  email: string
): Promise<string> {
  db.prepare(
    `
    DELETE FROM email_verification_codes
    WHERE user_id = ? AND used = FALSE
  `
  ).run(userId);

  const code = generateEmailVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  db.prepare(
    `
    INSERT INTO email_verification_codes (user_id, email, code, expires_at)
    VALUES (?, ?, ?, ?)
  `
  ).run(userId, email, code, expiresAt.toISOString());

  return code;
}

export async function verifyEmailVerificationCode(
  email: string,
  code: string
): Promise<{ success: boolean; userId?: number }> {
  const verificationCode = db
    .prepare(
      `
    SELECT * FROM email_verification_codes
    WHERE email = ? AND code = ? AND used = FALSE AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get(email, code) as EmailVerificationCode | undefined;

  if (!verificationCode) {
    return { success: false };
  }

  db.prepare(
    `
    UPDATE email_verification_codes
    SET used = TRUE
    WHERE id = ?
  `
  ).run(verificationCode.id);

  return { success: true, userId: verificationCode.user_id };
}

export async function hasValidEmailVerificationCode(
  userId: number
): Promise<boolean> {
  const count = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM email_verification_codes
    WHERE user_id = ? AND used = FALSE AND expires_at > datetime('now')
  `
    )
    .get(userId) as { count: number };

  return count.count > 0;
}

export async function cleanupUserEmailVerificationCodes(
  userId: number
): Promise<void> {
  db.prepare(
    `
    DELETE FROM email_verification_codes
    WHERE user_id = ? AND (used = TRUE OR expires_at < datetime('now'))
  `
  ).run(userId);
}

export async function getLastEmailVerificationAttempt(
  userId: number
): Promise<EmailVerificationCode | null> {
  const attempt = db
    .prepare(
      `
    SELECT * FROM email_verification_codes
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get(userId) as EmailVerificationCode | undefined;

  return attempt || null;
}
