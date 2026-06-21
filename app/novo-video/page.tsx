'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Tipo = 'video' | 'post-estatico' | 'carrossel'
type Duracao = 15 | 30 | 60 | 180 | 600

const DURACOES = [
  { id: 15,  label: '15s',    desc: 'Anúncio / Stories',       indicacao: 'Impacto rápido. 1 mensagem, 1 chamada para ação. Ideal para tráfego pago.' },
  { id: 30,  label: '30s',    desc: 'Reels / Feed',             indicacao: 'Storytelling curto. Apresenta o produto com emoção. Melhor taxa de conclusão orgânica.' },
  { id: 60,  label: '60s',    desc: 'Institucional',            indicacao: 'Narrativa completa. Ideal para lançamentos, inaugurações e vídeos de marca.' },
  { id: 180, label: '3 min',  desc: 'YouTube / Bastidores',     indicacao: 'Tutorial, tour ou bastidores. Estrutura em 3 blocos: apresentação, desenvolvimento e CTA.' },
  { id: 600, label: '5–10 min', desc: 'YouTube institucional',  indicacao: 'Vídeo completo de marca. Capítulos, depoimentos, tour da loja, lançamento de coleção.' },
]

interface Arquivo {
  name: string
  url: string
  id: string
  duracao: number
}

const TIPOS = [
  { id: 'video', label: '🎬 Vídeo', desc: 'Roteiro + legendas + hashtags' },
  { id: 'post-estatico', label: '🖼️ Post estático', desc: 'Texto + legenda + hashtags' },
  { id: 'carrossel', label: '📑 Carrossel', desc: 'Slides + legenda + hashtags' },
]

export default function NovoVideo() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tipo, setTipo] = useState<Tipo>((searchParams.get('tipo') as Tipo) || 'video')
  const [duracaoVideo, setDuracaoVideo] = useState<Duracao>((Number(searchParams.get('duracao')) as Duracao) || 30)
  const [briefing, setBriefing] = useState('')
  const [resultado, setResultado] = useState('')
  const [loading, setLoading] = useState(false)
  const [custo, setCusto] = useState<string | null>(null)
  const [arquivos, setArquivos] = useState<Arquivo[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgresso, setUploadProgresso] = useState('')
  const [uploadConcluido, setUploadConcluido] = useState(false)
  const [montando, setMontando] = useState(false)
  const [statusMontagem, setStatusMontagem] = useState('')
  const [videoFinal, setVideoFinal] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/')
    })
  }, [router])

  function estimarCusto(texto: string) {
    const tokens = Math.ceil(texto.length / 4)
    const totalTokens = tokens + 2048
    const custoUSD = (totalTokens / 1_000_000) * 3
    const custoBRL = custoUSD * 5.5
    return `~R$ ${custoBRL.toFixed(3)} (${totalTokens} tokens)`
  }

  function handleBriefingChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const valor = e.target.value
    setBriefing(valor)
    setCusto(valor.length > 20 ? estimarCusto(valor) : null)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const novos: Arquivo[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgresso(`Enviando ${i + 1} de ${files.length}: ${file.name}`)

      try {
        // Upload direto do browser para o Creatomate (sem passar pelo servidor)
        const buffer = await file.arrayBuffer()
        const res = await fetch('https://api.creatomate.com/v1/assets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CREATOMATE_API_KEY || 'f0a8c875-1c14-45f4-bdf0-c846d2ad1e27'}`,
            'Content-Type': file.type || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${file.name}"`,
          },
          body: buffer,
        })

        if (!res.ok) {
          console.error('Erro upload:', await res.text())
          continue
        }

        const data = await res.json()
        novos.push({ name: file.name, url: data.url, id: data.id, duracao: 5 })
      } catch (err) {
        console.error('Erro no upload de', file.name, err)
      }
    }

    setArquivos(prev => [...prev, ...novos])
    setUploading(false)
    setUploadProgresso('')
    setUploadConcluido(true)
    setTimeout(() => setUploadConcluido(false), 4000)
    if (inputRef.current) inputRef.current.value = ''
  }

  function removerArquivo(index: number) {
    setArquivos(prev => prev.filter((_, i) => i !== index))
  }

  function atualizarDuracao(index: number, duracao: number) {
    setArquivos(prev => prev.map((a, i) => i === index ? { ...a, duracao } : a))
  }

  async function gerar() {
    if (!briefing.trim()) return
    setLoading(true)
    setResultado('')

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90000)

      const res = await fetch('/api/gerar-roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing, tipo, duracaoVideo }),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!res.ok) {
        setResultado(`Erro do servidor: ${await res.text()}`)
        setLoading(false)
        return
      }

      const data = await res.json()
      setResultado(data.resultado || 'Erro ao gerar conteúdo.')
    } catch (e: any) {
      setResultado(e.name === 'AbortError' ? 'Tempo esgotado. Tente novamente.' : `Erro: ${e.message}`)
    }

    setLoading(false)
  }

  async function montarVideo() {
    if (arquivos.length === 0) return
    setMontando(true)
    setVideoFinal(null)
    setStatusMontagem('Enviando para montagem...')

    const res = await fetch('/api/montar-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clips: arquivos, roteiro: resultado, titulo: briefing.slice(0, 60) })
    })

    if (!res.ok) {
      setStatusMontagem(`Erro: ${await res.text()}`)
      setMontando(false)
      return
    }

    const { renderId } = await res.json()
    setStatusMontagem('Montando vídeo... (pode levar 1-3 minutos)')

    // Polling do status
    const poll = setInterval(async () => {
      const statusRes = await fetch(`/api/status-render?id=${renderId}`)
      const statusData = await statusRes.json()

      if (statusData.status === 'succeeded') {
        clearInterval(poll)
        setVideoFinal(statusData.url)
        setStatusMontagem('Vídeo pronto!')
        setMontando(false)
      } else if (statusData.status === 'failed') {
        clearInterval(poll)
        setStatusMontagem(`Falhou: ${statusData.error}`)
        setMontando(false)
      } else {
        setStatusMontagem(`Renderizando... (${statusData.status})`)
      }
    }, 5000)
  }

  const tipoAtual = TIPOS.find(t => t.id === tipo)!
  const aceitaArquivos = tipo === 'video' ? 'video/*,image/*' : 'image/*'

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

      <div className="max-w-4xl mx-auto px-8 py-10">
        <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--verde)' }}>Novo Conteúdo</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--dourado)' }}>Escolha o tipo, faça upload e descreva — a IA cria tudo.</p>

        {/* Seletor de tipo */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => { setTipo(t.id as Tipo); setResultado(''); setVideoFinal(null) }}
              className="p-4 rounded-xl text-left transition-all"
              style={{ background: tipo === t.id ? 'var(--verde)' : '#fff', color: tipo === t.id ? 'var(--bege)' : '#333', border: `1px solid ${tipo === t.id ? 'var(--verde)' : 'var(--bege-dourado)'}` }}>
              <div className="font-semibold text-sm mb-1">{t.label}</div>
              <div className="text-xs opacity-70">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Duração — só para vídeo */}
        {tipo === 'video' && (
          <div className="mb-8">
            <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--verde)' }}>
              Duração do vídeo
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {DURACOES.map(d => (
                <button key={d.id} onClick={() => setDuracaoVideo(d.id as Duracao)}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{
                    background: duracaoVideo === d.id ? '#fff' : '#fff',
                    border: `2px solid ${duracaoVideo === d.id ? 'var(--dourado)' : 'var(--bege-dourado)'}`,
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-bold" style={{ color: duracaoVideo === d.id ? 'var(--dourado)' : '#999' }}>{d.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: duracaoVideo === d.id ? 'var(--verde)' : 'var(--bege-dourado)', color: duracaoVideo === d.id ? 'var(--bege)' : '#666' }}>{d.desc}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#777' }}>{d.indicacao}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--verde)' }}>
                {tipo === 'video' ? 'Clips e fotos' : 'Imagens'}
              </label>
              <Link href="/projetos" className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
                style={{ border: '1px solid var(--dourado)', color: 'var(--dourado)' }}>
                ☁ Meus projetos
              </Link>
            </div>
            <div onClick={() => !uploading && inputRef.current?.click()}
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all"
              style={{
                borderColor: uploadConcluido ? '#4caf50' : uploading ? 'var(--dourado)' : 'var(--dourado)',
                background: uploadConcluido ? '#f0faf0' : '#fff',
                minHeight: '130px',
                cursor: uploading ? 'wait' : 'pointer'
              }}>
              {uploading ? (
                <>
                  <div className="text-2xl mb-2 animate-spin">⏳</div>
                  <p className="text-xs text-center px-4 font-medium" style={{ color: 'var(--dourado)' }}>{uploadProgresso}</p>
                  <p className="text-xs mt-1" style={{ color: '#999' }}>Aguarde, enviando para a nuvem...</p>
                </>
              ) : uploadConcluido ? (
                <>
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#4caf50' }}>
                    {arquivos.length} arquivo{arquivos.length > 1 ? 's' : ''} enviado{arquivos.length > 1 ? 's' : ''} com sucesso!
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#999' }}>Clique para adicionar mais</p>
                </>
              ) : (
                <>
                  <span className="text-3xl mb-2">{tipo === 'video' ? '🎬' : '🖼️'}</span>
                  <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--dourado)' }}>
                    {arquivos.length > 0 ? `${arquivos.length} arquivo${arquivos.length > 1 ? 's' : ''} — clique para adicionar mais` : 'Clique para enviar'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#999' }}>{tipo === 'video' ? 'MP4, MOV, JPG, PNG' : 'JPG, PNG, WEBP'}</p>
                </>
              )}
            </div>
            <input ref={inputRef} type="file" multiple accept={aceitaArquivos} onChange={handleUpload} className="hidden" />

            {arquivos.length > 0 && (
              <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
                {arquivos.map((arq, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: '#333' }}>
                        {arq.name.match(/\.(mp4|mov|avi)$/i) ? '🎬' : '🖼️'} {arq.name.length > 26 ? arq.name.substring(0, 26) + '...' : arq.name}
                      </span>
                      <button onClick={() => removerArquivo(i)} style={{ color: 'var(--dourado)' }}>✕</button>
                    </div>
                    {arq.name.match(/\.(mp4|mov|avi)$/i) && (
                      <div className="flex items-center gap-2">
                        <span style={{ color: '#999' }}>Duração:</span>
                        <input type="number" min={1} max={60} value={arq.duracao}
                          onChange={e => atualizarDuracao(i, Number(e.target.value))}
                          className="w-14 px-2 py-0.5 rounded border text-xs"
                          style={{ borderColor: 'var(--dourado)' }} />
                        <span style={{ color: '#999' }}>seg</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Status de arquivos */}
            {arquivos.length > 0 && (
              <p className="text-xs mt-2 text-center font-semibold" style={{ color: '#4caf50' }}>
                ✅ {arquivos.length} arquivo{arquivos.length > 1 ? 's' : ''} pronto{arquivos.length > 1 ? 's' : ''}
              </p>
            )}

            {videoFinal && (
              <a href={videoFinal} target="_blank" rel="noopener noreferrer"
                className="block w-full mt-3 py-3 rounded-xl text-xs uppercase tracking-widest font-semibold text-center"
                style={{ background: 'var(--verde)', color: 'var(--bege)' }}>
                ⬇ Baixar vídeo pronto
              </a>
            )}
          </div>

          {/* Briefing */}
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--verde)' }}>Briefing</label>
            <textarea value={briefing} onChange={handleBriefingChange} rows={7} disabled={loading}
              placeholder={tipo === 'video' ? 'Descreva o vídeo: tema, clima, cenas, ordem, duração...' : tipo === 'post-estatico' ? 'Descreva o post: tema, ambiente, mensagem principal...' : 'Descreva o carrossel: tema, slides, o que mostrar...'}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none disabled:opacity-60"
              style={{ borderColor: 'var(--dourado)', background: '#fff', color: '#333' }} />
            {custo && <p className="text-xs mt-1" style={{ color: 'var(--dourado)' }}>Custo estimado: <strong>{custo}</strong></p>}
          </div>
        </div>

        <div className="flex gap-3 mb-10 flex-wrap">
          <button onClick={gerar} disabled={loading || !briefing.trim()}
            className="px-6 py-3 rounded-xl text-sm uppercase tracking-widest font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--verde)', color: 'var(--bege)' }}>
            {loading ? `Gerando ${tipoAtual.label}...` : `✦ Gerar ${tipoAtual.label} com IA`}
          </button>

          {tipo === 'video' && (
            <button onClick={arquivos.length > 0 ? montarVideo : () => inputRef.current?.click()}
              disabled={montando}
              className="px-6 py-3 rounded-xl text-sm uppercase tracking-widest font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: arquivos.length > 0 ? 'var(--dourado)' : '#bbb', color: '#fff' }}>
              {montando
                ? statusMontagem
                : arquivos.length > 0
                  ? `▶ Montar vídeo · ${arquivos.length} clip${arquivos.length > 1 ? 's' : ''}`
                  : '▶ Montar vídeo · 0 clips'}
            </button>
          )}
        </div>

        {resultado && (
          <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid var(--bege-dourado)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm uppercase tracking-widest font-semibold" style={{ color: 'var(--verde)' }}>
                {tipoAtual.label} — gerado pela IA
              </h3>
              <button onClick={() => navigator.clipboard.writeText(resultado)}
                className="text-xs px-3 py-1 rounded-lg"
                style={{ border: '1px solid var(--dourado)', color: 'var(--dourado)' }}>
                Copiar tudo
              </button>
            </div>
            <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#333', fontFamily: 'Georgia, serif' }}>
              {resultado}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}
