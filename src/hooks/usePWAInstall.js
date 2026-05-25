import { useEffect, useState } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
  )

  useEffect(() => {
    if (isInstalled) return

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    function onInstalled() {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [isInstalled])

  const isIOS =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    window.navigator.standalone !== true

  async function promptInstall() {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') setIsInstalled(true)
    return outcome === 'accepted'
  }

  return {
    promptInstall,
    isInstalled,
    isIOS,
    canPrompt: !!deferredPrompt,
  }
}
