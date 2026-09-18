interface AttemptRecord {
  timestamps: number[];
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const emailAttempts = new Map<string, AttemptRecord>();
const ipAttempts = new Map<string, AttemptRecord>();

function getRemainingWindowSeconds(timestamps: number[], now: number): number {
  if (timestamps.length === 0) return 0;
  const oldestInWindow = timestamps[0];
  const elapsed = now - oldestInWindow;
  const remainingMs = WINDOW_MS - elapsed;
  return Math.max(1, Math.min(900, Math.ceil(remainingMs / 1000)));
}

function pruneOldAttempts(record: AttemptRecord, now: number): void {
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
}

export function checkLoginRateLimit(
  email: string,
  ip: string,
  now = Date.now(),
): { isLimited: boolean; retryAfterSeconds: number } {
  const normEmail = email.trim().toLowerCase();
  const normIp = ip.trim();

  const emailRec = emailAttempts.get(normEmail);
  if (emailRec) {
    pruneOldAttempts(emailRec, now);
    if (emailRec.timestamps.length >= MAX_ATTEMPTS) {
      return {
        isLimited: true,
        retryAfterSeconds: getRemainingWindowSeconds(emailRec.timestamps, now),
      };
    }
  }

  const ipRec = ipAttempts.get(normIp);
  if (ipRec) {
    pruneOldAttempts(ipRec, now);
    if (ipRec.timestamps.length >= MAX_ATTEMPTS) {
      return {
        isLimited: true,
        retryAfterSeconds: getRemainingWindowSeconds(ipRec.timestamps, now),
      };
    }
  }

  return { isLimited: false, retryAfterSeconds: 0 };
}

export function recordFailedLogin(email: string, ip: string, now = Date.now()): void {
  const normEmail = email.trim().toLowerCase();
  const normIp = ip.trim();

  let emailRec = emailAttempts.get(normEmail);
  if (!emailRec) {
    emailRec = { timestamps: [] };
    emailAttempts.set(normEmail, emailRec);
  }
  pruneOldAttempts(emailRec, now);
  emailRec.timestamps.push(now);

  let ipRec = ipAttempts.get(normIp);
  if (!ipRec) {
    ipRec = { timestamps: [] };
    ipAttempts.set(normIp, ipRec);
  }
  pruneOldAttempts(ipRec, now);
  ipRec.timestamps.push(now);
}

export function clearLoginRateLimit(email: string, ip: string): void {
  const normEmail = email.trim().toLowerCase();
  const normIp = ip.trim();
  emailAttempts.delete(normEmail);
  ipAttempts.delete(normIp);
}

export function resetAllRateLimits(): void {
  emailAttempts.clear();
  ipAttempts.clear();
}
