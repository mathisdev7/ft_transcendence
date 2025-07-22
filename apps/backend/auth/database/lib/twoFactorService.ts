import { db } from "../init";

export interface TwoFactorCode {
  id: number;
  user_id: number;
  code: string;
  expires_at: string;
  used: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function generateTwoFactorCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createTwoFactorCode(
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  db.prepare(
    `
    DELETE FROM two_factor_codes
    WHERE user_id = ? AND used = FALSE
  `
  ).run(userId);

  const code = generateTwoFactorCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  db.prepare(
    `
    INSERT INTO two_factor_codes (user_id, code, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(
    userId,
    code,
    expiresAt.toISOString(),
    ipAddress || null,
    userAgent || null
  );

  return code;
}

export async function verifyTwoFactorCode(
  userId: number,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  const twoFactorCode = db
    .prepare(
      `
    SELECT * FROM two_factor_codes
    WHERE user_id = ? AND code = ? AND used = FALSE AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get(userId, code) as TwoFactorCode | undefined;

  if (!twoFactorCode) {
    return false;
  }

  db.prepare(
    `
    UPDATE two_factor_codes
    SET used = TRUE
    WHERE id = ?
  `
  ).run(twoFactorCode.id);

  return true;
}

export async function hasValidTwoFactorCode(userId: number): Promise<boolean> {
  const count = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM two_factor_codes
    WHERE user_id = ? AND used = FALSE AND expires_at > datetime('now')
  `
    )
    .get(userId) as { count: number };

  return count.count > 0;
}

export async function cleanupUserTwoFactorCodes(userId: number): Promise<void> {
  db.prepare(
    `
    DELETE FROM two_factor_codes
    WHERE user_id = ? AND (used = TRUE OR expires_at < datetime('now'))
  `
  ).run(userId);
}

export async function getLastTwoFactorAttempt(
  userId: number
): Promise<TwoFactorCode | null> {
  const attempt = db
    .prepare(
      `
    SELECT * FROM two_factor_codes
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get(userId) as TwoFactorCode | undefined;

  return attempt || null;
}
