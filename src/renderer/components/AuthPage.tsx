import React, { useState } from 'react'

type AuthPageProps = {
  onAuthSuccess: (user: { id: string; email: string }) => void
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic Validation
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Email address is required.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const channel = isSignUp ? 'auth:signup' : 'auth:signin'
      const response = (await window.electron.invoke(channel, {
        email: trimmedEmail,
        password,
        rememberMe
      })) as { success: boolean; user?: { id: string; email: string }; error?: string }

      if (response.success && response.user) {
        onAuthSuccess(response.user)
      } else {
        setError(response.error || 'An unexpected error occurred.')
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to communicate with auth server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      {/* Glow highlight behind container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-appBorder bg-cardBg-default p-8 shadow-glow transition-all duration-300">
        <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl dark:bg-blue-400/5" />
        <div className="absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl dark:bg-purple-400/5" />

        <div className="relative text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82F6] dark:text-[#60A5FA]">
            CAT Prep Vault
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-appText-primary">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1.5 text-xs text-appText-muted font-medium">
            {isSignUp
              ? 'Enter email & password to sign up for public access'
              : 'Sign in to access your questions and analytics'}
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs text-red-650 dark:text-red-300 font-medium animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-appText-secondary mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aspirant@catprep.com"
              className="w-full rounded-xl border border-appBorder bg-appBg-primary px-3.5 py-2.5 text-xs text-appText-primary outline-none transition-all duration-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/35"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-appText-secondary mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-appBorder bg-appBg-primary pl-3.5 pr-10 py-2.5 text-xs text-appText-primary outline-none transition-all duration-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/35"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-appText-muted hover:text-appText-primary transition-colors cursor-pointer flex items-center justify-center"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
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
          </div>

          {isSignUp && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-appText-secondary mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  disabled={loading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-appBorder bg-appBg-primary pl-3.5 pr-10 py-2.5 text-xs text-appText-primary outline-none transition-all duration-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/35"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-appText-muted hover:text-appText-primary transition-colors cursor-pointer flex items-center justify-center"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
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
            </div>
          )}

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-appText-secondary">
              <input
                type="checkbox"
                disabled={loading}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-appBorder bg-appBg-primary text-[#3B82F6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative flex w-full justify-center items-center rounded-xl bg-[#3B82F6] py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#2563EB] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setShowPassword(false)
              setShowConfirmPassword(false)
            }}
            className="text-[11px] font-semibold text-[#3B82F6] dark:text-[#60A5FA] hover:underline cursor-pointer"
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  )
}
