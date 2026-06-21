'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/')
      } else {
        setUser(data.user)
      }
    })
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) return null

  return (
    <main className="min-h-screen" style={{ background: 'var(--bege)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 shadow-sm" style={{ background: 'var(--verde)' }}>
        <div>
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--dourado)' }}>CASA </span>
          <span className="text-lg font-bold tracking-widest uppercase" style={{ color: 'var(--bege)' }}>SOGNATTO</span>
          <span className="text-xs tracking-[0.2em] ml-3 uppercase" style={{ color: 'var(--dourado)' }}>Filmmaker</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: 'var(--bege-dourado)', border: '1px solid var(--dourado)' }}
        >
          Sair
        </button>
      </header>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--verde)' }}>
          Olá, {user.email}
        </h2>
        <p className="text-sm mb-10" style={{ color: 'var(--dourado)' }}>
          O que vamos criar hoje?
        </p>

        {/* Cards de ação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/novo-video">
            <div
              className="p-6 rounded-2xl shadow cursor-pointer hover:shadow-md transition-shadow"
              style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}
            >
              <div className="text-3xl mb-3">🎬</div>
              <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--verde)' }}>Novo Vídeo</h3>
              <p className="text-sm" style={{ color: '#666' }}>
                Descreva o vídeo e a IA gera o roteiro completo com cenas e narração.
              </p>
              <span className="inline-block mt-4 text-xs uppercase tracking-widest" style={{ color: 'var(--dourado)' }}>
                Começar →
              </span>
            </div>
          </Link>

          <Link href="/projetos">
            <div
              className="p-6 rounded-2xl shadow cursor-pointer hover:shadow-md transition-shadow"
              style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}
            >
              <div className="text-3xl mb-3">📁</div>
              <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--verde)' }}>Meus Projetos</h3>
              <p className="text-sm" style={{ color: '#666' }}>
                Acesse e baixe todos os vídeos montados pela IA.
              </p>
              <span className="inline-block mt-4 text-xs uppercase tracking-widest" style={{ color: 'var(--dourado)' }}>
                Ver projetos →
              </span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
