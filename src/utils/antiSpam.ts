export interface SenderMeta {
  ip: string;
  isVpn: boolean;
  countryCode: string;
  deviceId: string;
  userAgent: string;
  screen: string;
  spamSuspect: boolean;
  spamReasons: string[];
}

const DEVICE_ID_KEY = 'otzyvtop_device_id';
const RECENT_SUBMISSIONS_KEY = 'otzyvtop_recent_reviews';

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return 'unknown';
  }
}

function getRecentSubmissions(): Array<{ ip: string; deviceId: string; ts: number }> {
  try {
    const raw = localStorage.getItem(RECENT_SUBMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{ ip: string; deviceId: string; ts: number }>;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return Array.isArray(parsed) ? parsed.filter((item) => item.ts > dayAgo) : [];
  } catch {
    return [];
  }
}

function recordSubmission(ip: string, deviceId: string): void {
  try {
    const list = getRecentSubmissions();
    list.push({ ip, deviceId, ts: Date.now() });
    localStorage.setItem(RECENT_SUBMISSIONS_KEY, JSON.stringify(list.slice(-20)));
  } catch {
    // ignore storage errors
  }
}

export async function collectSenderMeta(): Promise<SenderMeta> {
  const deviceId = getOrCreateDeviceId();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  const screen =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : 'unknown';

  let ip = 'unknown';
  let isVpn = false;
  let countryCode = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as {
        ip?: string;
        country_code?: string;
        security?: { vpn?: boolean; proxy?: boolean; tor?: boolean; hosting?: boolean };
      };
      if (data.ip) ip = data.ip;
      if (data.country_code) countryCode = data.country_code;
      const sec = data.security;
      if (sec && (sec.vpn || sec.proxy || sec.tor || sec.hosting)) {
        isVpn = true;
      }
    }
  } catch {
    // GeoIP lookup is best-effort and must not block review submission
  }

  const spamReasons: string[] = [];
  if (isVpn) {
    spamReasons.push('VPN/Proxy');
  }

  const recent = getRecentSubmissions();
  const sameIpCount = ip !== 'unknown' ? recent.filter((r) => r.ip === ip).length : 0;
  const sameDeviceCount = recent.filter((r) => r.deviceId === deviceId).length;

  if (sameIpCount >= 2) {
    spamReasons.push(`Повторный IP (${sameIpCount + 1} за 24ч)`);
  }
  if (sameDeviceCount >= 2) {
    spamReasons.push(`Повторное устройство (${sameDeviceCount + 1} за 24ч)`);
  }

  recordSubmission(ip, deviceId);

  return {
    ip,
    isVpn,
    countryCode,
    deviceId,
    userAgent,
    screen,
    spamSuspect: spamReasons.length > 0,
    spamReasons,
  };
}
