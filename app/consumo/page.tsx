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

interface VideoHistorico {
  titulo: string
  creditos: number
  custo_brl: number
  duracao: number
  created_at: string
}

interface MesHistorico {
  mes: string
  chave: string
  creditos: number
  custo_brl: number
  videos: VideoHistorico[]
}

export default function ConsumoPage() {
  const router = useRouter()
  const [aba, setAba] = useState<'resumo' | 'historico'>('resumo')
  const [dados, setDados] = useState<Consumo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [meses, setMeses] = useState<MesHistorico[]>([])
  const [carregandoHist, setCarregandoHist] = useState(false)
  const [erroHist, setErroHist] = useState('')
  const [mesAberto, setMesAberto] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/')
    })
    carregarResumo()
  }, [router])

  async function carregarResumo() {
    setCarregando(true)
    try {
      const res = await fetch('/api/consumo')
      const data = await res.json()
      if (data.error) setErro(data.error)
      else setDados(data)
    } catch {
      setErro('Não foi possível carregar o consumo.')
    }
    setCarregando(false)
  }

  async function carregarHistorico() {
    if (meses.length > 0) return
    setCarregandoHist(true)
    try {
      const res = await fetch('/api/historico')
      const data = await res.json()
      if (data.error) setErroHist(data.error)
      else {
        setMeses(data.meses || [])
        if (data.meses?.length > 0) setMesAberto(data.meses[0].chave)
      }
    } catch {
      setErroHist('Não foi possível carregar o histórico.')
    }
    setCarregandoHist(false)
  }

  function mudarAba(nova: 'resumo' | 'historico') {
    setAba(nova)
    if (nova === 'historico') carregarHistorico()
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
        <Link href="/dashboard" className="text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: 'var(--bege-dourado)', border: '1px solid var(--dourado)' }}>
          ← Voltar
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-8 py-10">
        <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--verde)' }}>Créditos Creatomate</h2>

        {/* Abas */}
        <div className="flex gap-2 mb-8">
          {(['resumo', 'historico'] as const).map(a => (
            <button key={a} onClick={() => mudarAba(a)}
              className="px-5 py-2 rounded-lg text-xs uppercase tracking-widest font-semibold transition-all"
              style={{
                background: aba === a ? 'var(--verde)' : '#fff',
                color: aba === a ? 'var(--bege)' : 'var(--verde)',
                border: `1px solid var(--verde)`,
              }}>
              {a === 'resumo' ? '📊 Resumo do mês' : '📋 Histórico'}
            </button>
          ))}
        </div>

        {/* ABA: RESUMO */}
        {aba === 'resumo' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm" style={{ color: 'var(--dourado)' }}>
                {dados?.mes || 'mês atual'}
              </p>
              <button onClick={carregarResumo} className="text-xs px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ border: '1px solid var(--dourado)', color: 'var(--dourado)' }}>
                ↺ Atualizar
              </button>
            </div>

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

                <div className="rounded-xl p-4" style={{ background: '#fffaf0', border: '1px solid var(--bege-dourado)' }}>
                  <p className="text-xs leading-relaxed" style={{ color: '#777' }}>
                    ℹ️ <strong>Estimativa.</strong> Calculamos os créditos pela fórmula oficial do Creatomate
                    (largura × altura × fps × duração ÷ 100 milhões). Conta apenas os vídeos montados por este app.
                  </p>
                  <a href="https://creatomate.com/projects" target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-3 text-xs uppercase tracking-widest px-4 py-2 rounded-lg font-semibold"
                    style={{ background: 'var(--verde)', color: 'var(--bege)' }}>
                    Abrir painel oficial →
                  </a>
                </div>
              </>
            )}
          </>
        )}

        {/* ABA: HISTÓRICO */}
        {aba === 'historico' && (
          <>
            {carregandoHist && (
              <div className="text-center py-20" style={{ color: 'var(--dourado)' }}>
                <div className="text-3xl mb-3">⏳</div>
                <p className="text-sm uppercase tracking-widest">Carregando histórico...</p>
              </div>
            )}

            {!carregandoHist && erroHist && (
              <p className="text-sm text-center py-10" style={{ color: '#e53935' }}>{erroHist}</p>
            )}

            {!carregandoHist && !erroHist && meses.length === 0 && (
              <div className="text-center py-20" style={{ color: '#aaa' }}>
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm">Nenhum vídeo montado ainda.</p>
              </div>
            )}

            {!carregandoHist && meses.map(m => (
              <div key={m.chave} className="mb-4 rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>

                {/* Cabeçalho do mês */}
                <button className="w-full flex items-center justify-between px-6 py-4 text-left transition-opacity hover:opacity-80"
                  onClick={() => setMesAberto(mesAberto === m.chave ? null : m.chave)}>
                  <div>
                    <span className="text-sm font-semibold capitalize" style={{ color: 'var(--verde)' }}>{m.mes}</span>
                    <span className="ml-3 text-xs" style={{ color: '#999' }}>{m.videos.length} vídeo{m.videos.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold" style={{ color: 'var(--dourado)' }}>
                      R$ {m.custo_brl.toFixed(2)}
                    </div>
                    <div className="text-xs" style={{ color: '#aaa' }}>{m.creditos} créditos</div>
                  </div>
                </button>

                {/* Lista de vídeos do mês */}
                {mesAberto === m.chave && (
                  <div style={{ borderTop: '1px solid var(--bege-dourado)' }}>
                    {m.videos.map((v, i) => {
                      const dt = new Date(v.created_at)
                      const dataFmt = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                      const horaFmt = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <div key={i} className="flex items-center justify-between px-6 py-3"
                          style={{ borderBottom: i < m.videos.length - 1 ? '1px solid var(--bege-dourado)' : 'none' }}>
                          <div>
                            <p className="text-sm" style={{ color: '#333' }}>{v.titulo || 'Sem título'}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>{dataFmt} às {horaFmt} · {v.duracao}s de vídeo</p>
                          </div>
                          <div className="text-right ml-4 shrink-0">
                            <div className="text-sm font-semibold" style={{ color: 'var(--verde)' }}>
                              R$ {v.custo_brl.toFixed(2)}
                            </div>
                            <div className="text-xs" style={{ color: '#aaa' }}>{v.creditos} créditos</div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Total do mês */}
                    <div className="flex items-center justify-between px-6 py-3"
                      style={{ background: 'var(--bege)', borderTop: '2px solid var(--bege-dourado)' }}>
                      <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--verde)' }}>
                        Total {m.mes}
                      </span>
                      <span className="text-base font-bold" style={{ color: 'var(--dourado)' }}>
                        R$ {m.custo_brl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  )
}
