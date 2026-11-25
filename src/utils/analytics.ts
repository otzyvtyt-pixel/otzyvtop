const VIEWED_COMPANIES_KEY = 'otzyvtop_viewed_companies';

/**
 * Checks whether this company was already counted in the current browser session
 * to prevent inflated view counts and save Firestore write quota.
 */
export function shouldCountCompanyView(companyId: number): boolean {
  try {
    const raw = sessionStorage.getItem(VIEWED_COMPANIES_KEY);
    const viewed: number[] = raw ? (JSON.parse(raw) as number[]) : [];
    if (viewed.includes(companyId)) {
      return false;
    }
    viewed.push(companyId);
    sessionStorage.setItem(VIEWED_COMPANIES_KEY, JSON.stringify(viewed.slice(-200)));
    return true;
  } catch {
    return true;
  }
}

/**
 * Initializes Cloudflare Web Analytics or Google Analytics 4 if configured in .env.
 */
export function initExternalAnalytics(): void {
  if (typeof document === 'undefined') return;

  const cfToken = import.meta.env.VITE_CF_BEACON_TOKEN as string | undefined;
  if (cfToken && !document.querySelector('script[data-cf-beacon]')) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: cfToken }));
    document.head.appendChild(script);
  }

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (gaId && !document.querySelector(`script[src*="gtag/js?id=${gaId}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);

    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer?.push(args);
    };
    w.gtag('js', new Date());
    w.gtag('config', gaId);
  }
}
