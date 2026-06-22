'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Consumo {
  creditosUsados: number
  creditosRestantes: number
  limite: number
  totalVideos: number
  segundosTotais: number
  mes: string
}

export default function ConsumoPage() {
  const router = useRouter()
  const [dados, setDados] = useState<Consumo | null>(null)
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
    try {
      const res = await fetch('/api/consumo')
      const data = await res.json()
      if (data.error) setErro(data.error)
      else setDados(data)
    } catch (e: any) {
      setErro('Não foi possível carregar o consumo.')
    }
    setCarregando(false)
  }

  const percentual = dados ? Math.min(100, (dados.creditosUsados / dados.limite) * 100) : 0
  const corBarra = percentual > 85 ? '#e53935' : percentual > 60 ? 'var(--dourado)' : '#4caf50'

  return (
    <main className="min-h-screen" style={{ background: 'var(--bege)' }}>
      <header className="flex items-center justify-between px-8 py-4 shadow-sm" style={{ background: 'var(--verde)' }}>
        <div>
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: 'var(--dourado)' }}>CASA </span>
          <span className="text-lg font-bold tracking-widest uppercase" style={{ color: 'var(--bege)' }}>SOGNATTO</span>
          <span className="text-xs tracking-[0.2em] ml-3 uppercase" style={{ color: 'var(--dourado)' }}>Filmmaker</span>
        </div>
        <Link href="/dashboard" className="text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-opacity hover:opacity-80" style={{ color: 'var(--bege-dourado)', border: '1px solid var(--dourado)' }}>
          ← Voltar
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--verde)' }}>Consumo de Créditos</h2>
          <button onClick={carregar} className="text-xs px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--dourado)', color: 'var(--dourado)' }}>
            ↺ Atualizar
          </button>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--dourado)' }}>
          Creatomate — {dados?.mes || 'mês atual'}
        </p>

        {carregando && (
          <div className="text-center py-20" style={{ color: 'var(--dourado)' }}>
            <div className="text-3xl mb-3">⏳</div>
            <p className="text-sm uppercase tracking-widest">Carregando...</p>
          </div>
        )}

        {!carregando && erro && (
          <div className="text-center py-10">
            <p className="text-sm mb-2" style={{ color: '#e53935' }}>{erro}</p>
            <p className="text-xs" style={{ color: '#999' }}>
              (Se for a primeira vez, talvez a tabela do banco ainda não exista — me avise.)
            </p>
          </div>
        )}

        {!carregando && !erro && dados && (
          <>
            {/* Barra de uso */}
            <div className="rounded-2xl p-6 mb-6" style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="text-4xl font-bold" style={{ color: 'var(--verde)' }}>{dados.creditosUsados}</span>
                  <span className="text-lg" style={{ color: '#999' }}> / {dados.limite} créditos</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: corBarra }}>{percentual.toFixed(0)}%</span>
              </div>
              <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'var(--bege)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${percentual}%`, background: corBarra }} />
              </div>
              <p className="text-xs mt-3" style={{ color: '#888' }}>
                <strong style={{ color: 'var(--verde)' }}>{dados.creditosRestantes}</strong> créditos restantes neste mês
              </p>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
                <div className="text-2xl mb-1">🎬</div>
                <div className="text-2xl font-bold" style={{ color: 'var(--verde)' }}>{dados.totalVideos}</div>
                <div className="text-xs" style={{ color: '#999' }}>vídeos montados este mês</div>
              </div>
              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
                <div className="text-2xl mb-1">⏱️</div>
                <div className="text-2xl font-bold" style={{ color: 'var(--verde)' }}>{dados.segundosTotais}s</div>
                <div className="text-xs" style={{ color: '#999' }}>de vídeo renderizado</div>
              </div>
            </div>

            {/* Nota sobre estimativa */}
            <div className="rounded-xl p-4" style={{ background: '#fffaf0', border: '1px solid var(--bege-dourado)' }}>
              <p className="text-xs leading-relaxed" style={{ color: '#777' }}>
                ℹ️ <strong>Estimativa.</strong> Calculamos os créditos pela fórmula oficial do Creatomate
                (largura × altura × fps × duração ÷ 100 milhões). Conta apenas os vídeos montados por este app
                a partir de agora. Para o número oficial e exato, confira o painel do Creatomate:
              </p>
              <a href="https://creatomate.com/projects" target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 text-xs uppercase tracking-widest px-4 py-2 rounded-lg font-semibold"
                style={{ background: 'var(--verde)', color: 'var(--bege)' }}>
                Abrir painel oficial →
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
