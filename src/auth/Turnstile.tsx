import { useEffect, useRef } from 'react'

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      theme: 'auto'
      callback: (token: string) => void
      'error-callback': () => void
      'expired-callback': () => void
    },
  ) => string
  remove: (widgetId: string) => void
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi }

const SCRIPT_ID = 'cloudflare-turnstile'

export function Turnstile({
  label,
  onToken,
  resetKey,
}: {
  label: string
  onToken: (token: string | null) => void
  resetKey: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let widgetId: string | undefined
    const renderWidget = () => {
      const api = (window as TurnstileWindow).turnstile
      if (!api || !containerRef.current || widgetId) return
      widgetId = api.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'auto',
        callback: onToken,
        'error-callback': () => onToken(null),
        'expired-callback': () => onToken(null),
      })
    }

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', renderWidget)
    renderWidget()

    return () => {
      script?.removeEventListener('load', renderWidget)
      if (widgetId) (window as TurnstileWindow).turnstile?.remove(widgetId)
      onToken(null)
    }
  }, [onToken, resetKey, siteKey])

  if (!siteKey) return null
  return <div ref={containerRef} aria-label={label} className="flex min-h-[65px] justify-center" />
}
