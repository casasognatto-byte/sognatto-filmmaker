'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ATALHOS_VIDEO = [
  { duracao: 15,  label: '15s',     desc: 'Anúncio / Stories',      emoji: '⚡' },
  { duracao: 30,  label: '30s',     desc: 'Reels / Feed',            emoji: '🎬' },
  { duracao: 60,  label: '60s',     desc: 'Institucional',           emoji: '🎥' },
  { duracao: 180, label: '3 min',   desc: 'YouTube / Bastidores',    emoji: '📹' },
  { duracao: 600, label: '5–10 min',desc: 'YouTube institucional',   emoji: '🎞️' },
]

const ATALHOS_CONTEUDO = [
  { tipo: 'post-estatico', label: 'Post Estático', desc: 'Texto + legenda + hashtags', emoji: '🖼️' },
  { tipo: 'carrossel',     label: 'Carrossel',     desc: 'Slides + legenda + hashtags', emoji: '📑' },
]

function Card({ href, emoji, title, desc, sub }: { href: string, emoji: string, title: string, desc: string, sub: string }) {
  return (
    <Link href={href}>
      <div className="p-5 rounded-2xl cursor-pointer hover:shadow-md transition-all h-full"
        style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
        <div className="text-2xl mb-2">{emoji}</div>
        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--verde)' }}>{title}</h3>
        <p className="text-xs mb-3" style={{ color: '#888' }}>{desc}</p>
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--dourado)' }}>{sub} →</span>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/')
      else setUser(data.user)
    })
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) return null

  return (
    <main className="min-h-screen" style={{ background: 'var(--bege)' }}>
      <header className="flex items-center justify-between px-8 py-4 shadow-sm" style={{ background: 'var(--verde)' }}>
        <div>
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--dourado)' }}>CASA </span>
          <span className="text-lg font-bold tracking-widest uppercase" style={{ color: 'var(--bege)' }}>SOGNATTO</span>
          <span className="text-xs tracking-[0.2em] ml-3 uppercase" style={{ color: 'var(--dourado)' }}>Filmmaker</span>
        </div>
        <button onClick={handleLogout}
          className="text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: 'var(--bege-dourado)', border: '1px solid var(--dourado)' }}>
          Sair
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-12">
        <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--verde)' }}>
          Olá, {user.email.split('@')[0]}
        </h2>
        <p className="text-sm mb-10" style={{ color: 'var(--dourado)' }}>O que vamos criar hoje?</p>

        {/* Principal */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/novo-video">
            <div className="p-6 rounded-2xl cursor-pointer hover:shadow-md transition-all"
              style={{ background: 'var(--verde)', border: '1px solid var(--verde)' }}>
              <div className="text-3xl mb-3">🎬</div>
              <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--bege)' }}>Nova Postagem</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--bege-dourado)' }}>Vídeo, post ou carrossel com roteiro gerado pela IA.</p>
              <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--dourado)' }}>Começar →</span>
            </div>
          </Link>

          <Link href="/projetos">
            <div className="p-6 rounded-2xl cursor-pointer hover:shadow-md transition-all"
              style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
              <div className="text-3xl mb-3">📁</div>
              <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--verde)' }}>Meus Projetos</h3>
              <p className="text-sm mb-4" style={{ color: '#666' }}>Pasta com todos os vídeos prontos para baixar.</p>
              <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--dourado)' }}>Ver projetos →</span>
            </div>
          </Link>
        </div>

        {/* Atalhos de vídeo por duração */}
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#aaa' }}>Vídeos — acesso rápido por duração</p>
        <div className="grid grid-cols-5 gap-3 mb-8">
          {ATALHOS_VIDEO.map(a => (
            <Link key={a.duracao} href={`/novo-video?tipo=video&duracao=${a.duracao}`}>
              <div className="p-4 rounded-xl cursor-pointer hover:shadow-md transition-all text-center"
                style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
                <div className="text-xl mb-1">{a.emoji}</div>
                <div className="font-bold text-sm mb-0.5" style={{ color: 'var(--verde)' }}>{a.label}</div>
                <div className="text-xs" style={{ color: '#999' }}>{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Atalhos de conteúdo */}
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#aaa' }}>Conteúdo estático</p>
        <div className="grid grid-cols-2 gap-3">
          {ATALHOS_CONTEUDO.map(a => (
            <Link key={a.tipo} href={`/novo-video?tipo=${a.tipo}`}>
              <div className="p-5 rounded-xl cursor-pointer hover:shadow-md transition-all"
                style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
                <div className="text-2xl mb-2">{a.emoji}</div>
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--verde)' }}>{a.label}</div>
                <div className="text-xs" style={{ color: '#999' }}>{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
