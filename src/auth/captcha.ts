export function isCaptchaEnabled(): boolean {
  return Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
}
