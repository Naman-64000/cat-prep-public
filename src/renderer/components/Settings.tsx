import { useEffect, useState, useMemo } from 'react'
import NotificationToast from './NotificationToast'

function Settings({ currentUserEmail }: { currentUserEmail: string }) {
  // Gemini key states
  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<{ success?: boolean; message?: string } | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showKey, setShowKey] = useState(false)

  // Suggestion states
  const [suggestionInput, setSuggestionInput] = useState('')
  const [isSendingSuggestion, setIsSendingSuggestion] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  const isKeySaved = useMemo(() => {
    return savedKey !== '' && geminiKeyInput.trim() === savedKey.trim()
  }, [savedKey, geminiKeyInput])

  useEffect(() => {
    if (!showInfo) return
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.gemini-info-container')) {
        setShowInfo(false)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [showInfo])

  useEffect(() => {
    window.electron.invoke('settings:get').then((res: any) => {
      if (res && res.success && res.settings?.geminiApiKey) {
        const apiKey = res.settings.geminiApiKey
        setGeminiKeyInput(apiKey)
        setSavedKey(apiKey)
      }
    })
  }, [])

  const handleSaveKey = async () => {
    if (!geminiKeyInput.trim()) {
      setIsVerifying(true)
      setVerifyStatus(null)
      try {
        const saveRes: any = await window.electron.invoke('settings:save', '')
        if (saveRes.success) {
          setVerifyStatus({ success: true, message: 'API key cleared. Solution generation is now disabled.' })
          setSavedKey('')
        } else {
          setVerifyStatus({ success: false, message: `Failed to clear key: ${saveRes.error}` })
        }
      } catch (err: any) {
        setVerifyStatus({ success: false, message: err.message })
      } finally {
        setIsVerifying(false)
      }
      return
    }

    setIsVerifying(true)
    setVerifyStatus(null)

    try {
      const verifyRes: any = await window.electron.invoke('settings:verifyKey', geminiKeyInput.trim())
      if (verifyRes.success) {
        const saveRes: any = await window.electron.invoke('settings:save', geminiKeyInput.trim())
        if (saveRes.success) {
          setVerifyStatus({ success: true, message: 'Key verified and saved successfully!' })
          setSavedKey(geminiKeyInput.trim())
        } else {
          setVerifyStatus({ success: false, message: `Verified, but failed to save: ${saveRes.error}` })
        }
      } else {
        setVerifyStatus({ success: false, message: `Verification failed: ${verifyRes.error || 'Invalid API Key'}` })
      }
    } catch (err: any) {
      setVerifyStatus({ success: false, message: `Error: ${err.message}` })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSendSuggestion = async () => {
    const text = suggestionInput.trim()
    if (!text) return

    setIsSendingSuggestion(true)
    try {
      const response: any = await window.electron.invoke('suggestion:send', { text })
      if (response.success) {
        setSuggestionInput('')
        setToastType('success')
        setToastMessage('Suggestion sent! You can send more after 1 hour.')
      } else {
        setToastType('error')
        setToastMessage(response.error || 'Failed to send suggestion.')
      }
    } catch (err: any) {
      setToastType('error')
      setToastMessage(err.message || 'An error occurred.')
    } finally {
      setIsSendingSuggestion(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-appText-primary">Settings</h2>
        <p className="mt-1 text-[10px] text-appText-muted">
          Manage your API key, send feedback, and learn how your data is handled.
        </p>
      </div>

      {/* Data & Privacy Info Box */}
      <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 shadow-sm transition-all duration-200">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 text-sky-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
              How Your Data Is Stored
            </h3>
            <p className="text-[11px] text-appText-secondary leading-relaxed">
              This app stores all your data — questions, study logs, and settings — in a local SQLite database on your own computer. Nothing is ever sent to an external server, which means your data is completely private and only accessible to you. The downside of this approach is that there is no central backup: if you lose access to your account or your device, your data cannot be recovered.
            </p>
          </div>
        </div>
      </section>

      {/* Gemini API Key Configuration */}
      <section className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-all duration-200 relative">
        <div className="flex items-center justify-between border-b border-appBorder pb-2.5 mb-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-appText-primary flex items-center gap-1.5">
              <span>Gemini API Integration</span>
              <div className="relative inline-block cursor-pointer gemini-info-container">
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className="text-appText-muted hover:text-sky-500 transition-colors p-0.5 outline-none cursor-pointer flex items-center justify-center"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                <div className={`absolute left-6 top-1/2 -translate-y-1/2 w-72 p-4 bg-appBg-primary border border-appBorder rounded-xl shadow-xl z-20 text-[10px] text-appText-secondary space-y-2 normal-case font-normal transition-all duration-500 ease-out ${
                  showInfo
                    ? 'opacity-100 scale-100 pointer-events-auto visible'
                    : 'opacity-0 scale-95 pointer-events-none invisible'
                }`}>
                  <p className="font-bold text-appText-primary">How to get your Gemini API Key:</p>
                  <ol className="list-decimal list-inside space-y-1 text-appText-muted">
                    <li>Go to Google AI Studio.</li>
                    <li>Sign in with your Google account.</li>
                    <li>Click the "Create API Key" button.</li>
                    <li>Copy the key and paste it here!</li>
                  </ol>
                  <div className="pt-1.5 border-t border-appBorder">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-500 hover:underline font-bold flex items-center gap-0.5"
                    >
                      <span>Go to Google AI Studio</span>
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </h2>
            <p className="text-[10px] text-appText-muted mt-0.5">
              Configure your private Gemini API key. A valid key is required to generate solutions.
            </p>
          </div>
          <span className="text-[9px] font-mono text-[#3B82F6] dark:text-[#60A5FA] bg-[#3B82F6]/[0.05] dark:bg-[#60A5FA]/[0.05] px-2 py-0.5 border border-[#3B82F6]/20 dark:border-[#60A5FA]/25 rounded uppercase font-bold tracking-wider">
            Custom Key Setup
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              placeholder="Enter your Gemini Public API Key (e.g. AIzaSy...)"
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary pl-3.5 pr-10 py-2 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-appText-muted hover:text-appText-primary transition-colors cursor-pointer flex items-center justify-center"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveKey}
            disabled={isVerifying || isKeySaved}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 select-none ${
              isVerifying
                ? 'bg-appBg-secondary text-appText-disabled cursor-not-allowed border border-appBorder'
                : isKeySaved
                ? 'bg-emerald-600/[0.08] border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 cursor-not-allowed font-medium'
                : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-indigo-600/10 cursor-pointer'
            }`}
          >
            {isVerifying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-appText-disabled/30 border-t-appText-disabled rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : isKeySaved ? (
              <>
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Saved Key</span>
              </>
            ) : (
              <span>Verify &amp; Save Key</span>
            )}
          </button>
        </div>

        {verifyStatus && (
          <div className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2 animate-fadeIn ${
            verifyStatus.success
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-450'
              : 'border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-455'
          }`}>
            {verifyStatus.success ? (
              <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="font-semibold">{verifyStatus.message}</div>
          </div>
        )}
      </section>

      {/* Suggestions Section */}
      <section className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-all duration-200">
        <div className="border-b border-appBorder pb-2.5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-appText-primary">
            Suggestions
          </h2>
          <p className="text-[10px] text-appText-muted mt-0.5">
            Share your feedback to help us improve the application.
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            placeholder="How can we make this app better? Please put your suggestions."
            value={suggestionInput}
            maxLength={500}
            onChange={(e) => {
              const val = e.target.value
              setSuggestionInput(val)
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            rows={2}
            className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3.5 py-2 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150 resize-none overflow-hidden"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-appText-muted">
              {suggestionInput.length} / 500 characters
            </span>
            <button
              type="button"
              onClick={handleSendSuggestion}
              disabled={isSendingSuggestion || !suggestionInput.trim()}
              className="rounded-full bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-500 px-5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingSuggestion ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </section>

      {toastMessage && (
        <NotificationToast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  )
}

export default Settings
