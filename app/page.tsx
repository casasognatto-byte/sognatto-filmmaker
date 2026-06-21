'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--verde)' }}>
      <div className="w-full max-w-sm p-8 rounded-2xl shadow-xl" style={{ background: 'var(--bege)' }}>
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--dourado)' }}>CASA</p>
          <h1 className="text-3xl font-bold tracking-widest uppercase" style={{ color: 'var(--verde)' }}>SOGNATTO</h1>
          <p className="text-xs tracking-[0.2em] mt-2 uppercase" style={{ color: 'var(--dourado)' }}>Filmmaker</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--verde)' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--dourado)', background: '#fff' }}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--verde)' }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--dourado)', background: '#fff' }}
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm uppercase tracking-widest font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--verde)', color: 'var(--bege)' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
