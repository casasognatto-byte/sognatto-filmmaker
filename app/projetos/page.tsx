'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Render {
  id: string
  status: 'succeeded' | 'failed' | 'planned' | 'rendering' | 'queued'
  url: string | null
  created_at: string
  error_message: string | null
}

function statusLabel(status: string) {
  switch (status) {
    case 'succeeded': return { texto: 'Pronto', cor: '#4caf50' }
    case 'failed':    return { texto: 'Falhou', cor: '#e53935' }
    case 'rendering': return { texto: 'Renderizando...', cor: 'var(--dourado)' }
    case 'queued':    return { texto: 'Na fila', cor: '#999' }
    default:          return { texto: status, cor: '#999' }
  }
}

function formatarData(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Projetos() {
  const router = useRouter()
  const [renders, setRenders] = useState<Render[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/')
    })
    carregar()
  }, [router])

  async function carregar() {
    setCarregando(true)
    const res = await fetch('/api/listar-renders')
    const data = await res.json()
    if (data.renders) setRenders(data.renders)
    else setErro('Não foi possível carregar os projetos.')
    setCarregando(false)
  }

  const prontos = renders.filter(r => r.status === 'succeeded')
  const emAndamento = renders.filter(r => ['rendering', 'queued', 'planned'].includes(r.status))
  const falhos = renders.filter(r => r.status === 'failed')

  return (
    <main className="min-h-screen" style={{ background: 'var(--bege)' }}>
      <header className="flex items-center justify-between px-8 py-4 shadow-sm" style={{ background: 'var(--verde)' }}>
        <div>
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--dourado)' }}>CASA </span>
          <span className="text-lg font-bold tracking-widest uppercase" style={{ color: 'var(--bege)' }}>SOGNATTO</span>
          <span className="text-xs tracking-[0.2em] ml-3 uppercase" style={{ color: 'var(--dourado)' }}>Filmmaker</span>
        </div>
        <div className="flex gap-3">
          <Link href="/novo-video" className="text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-opacity hover:opacity-80" style={{ background: 'var(--dourado)', color: '#fff' }}>
            + Novo vídeo
          </Link>
          <Link href="/dashboard" className="text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-opacity hover:opacity-80" style={{ color: 'var(--bege-dourado)', border: '1px solid var(--dourado)' }}>
            ← Voltar
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--verde)' }}>Meus Projetos</h2>
            <p className="text-sm" style={{ color: 'var(--dourado)' }}>Todos os vídeos montados pelo Creatomate</p>
          </div>
          <button onClick={carregar} className="text-xs px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--dourado)', color: 'var(--dourado)' }}>
            ↺ Atualizar
          </button>
        </div>

        {carregando && (
          <div className="text-center py-20" style={{ color: 'var(--dourado)' }}>
            <div className="text-3xl mb-3">⏳</div>
            <p className="text-sm uppercase tracking-widest">Carregando projetos...</p>
          </div>
        )}

        {!carregando && erro && (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: '#e53935' }}>{erro}</p>
          </div>
        )}

        {!carregando && !erro && renders.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-sm uppercase tracking-widest mb-6" style={{ color: 'var(--dourado)' }}>Nenhum projeto ainda</p>
            <Link href="/novo-video" className="text-xs uppercase tracking-widest px-6 py-3 rounded-xl"
              style={{ background: 'var(--verde)', color: 'var(--bege)' }}>
              Criar primeiro vídeo
            </Link>
          </div>
        )}

        {/* Em andamento */}
        {emAndamento.length > 0 && (
          <section className="mb-10">
            <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: '#999' }}>Em andamento ({emAndamento.length})</h3>
            <div className="space-y-3">
              {emAndamento.map(r => {
                const s = statusLabel(r.status)
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-4 rounded-xl"
                    style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
                    <div>
                      <p className="text-xs font-mono mb-1" style={{ color: '#999' }}>{r.id.slice(0, 16)}...</p>
                      <p className="text-xs" style={{ color: '#666' }}>{formatarData(r.created_at)}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#fff8e1', color: s.cor, border: `1px solid ${s.cor}` }}>
                      {s.texto}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Prontos */}
        {prontos.length > 0 && (
          <section className="mb-10">
            <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: '#999' }}>Prontos ({prontos.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prontos.map((r, i) => (
                <div key={r.id} className="rounded-2xl overflow-hidden"
                  style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
                  {/* Preview do vídeo */}
                  <div className="relative" style={{ background: 'var(--verde)', aspectRatio: '9/16', maxHeight: '280px' }}>
                    <video
                      src={r.url!}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs mb-1" style={{ color: '#999' }}>
                      {formatarData(r.created_at)}
                    </p>
                    <p className="text-xs font-mono mb-3" style={{ color: '#bbb' }}>{r.id.slice(0, 20)}...</p>
                    <a href={r.url!} download target="_blank" rel="noopener noreferrer"
                      className="block text-center text-xs uppercase tracking-widest py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'var(--verde)', color: 'var(--bege)' }}>
                      ⬇ Baixar vídeo
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Falhos */}
        {falhos.length > 0 && (
          <section>
            <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: '#999' }}>Com erro ({falhos.length})</h3>
            <div className="space-y-3">
              {falhos.map(r => (
                <div key={r.id} className="flex items-center justify-between px-5 py-4 rounded-xl"
                  style={{ background: '#fff', border: '1px solid #ffd0d0' }}>
                  <div>
                    <p className="text-xs font-mono mb-1" style={{ color: '#999' }}>{r.id.slice(0, 16)}...</p>
                    <p className="text-xs mb-1" style={{ color: '#666' }}>{formatarData(r.created_at)}</p>
                    {r.error_message && <p className="text-xs" style={{ color: '#e53935' }}>{r.error_message}</p>}
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#fff0f0', color: '#e53935', border: '1px solid #e53935' }}>
                    Falhou
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
