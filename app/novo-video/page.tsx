'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, Suspense } from 'react'
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

// Máximo de segundos que aproveitamos de cada clipe (limita o tempo de compressão).
const MAX_SEGUNDOS_CLIPE = 15

/**
 * Comprime um vídeo no navegador: reduz para no máx. 1080p, 30fps, sem áudio,
 * cortando os primeiros MAX_SEGUNDOS_CLIPE segundos. Streama do arquivo (não carrega
 * os GBs na memória), então funciona com os vídeos crus do drone.
 */
function comprimirVideo(file: File, onProgress?: (pct: number) => void, sinal?: { cancelado: boolean }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    const urlObj = URL.createObjectURL(file)
    video.src = urlObj

    video.onloadedmetadata = () => {
      let w = video.videoWidth
      let h = video.videoHeight
      if (!w || !h) { URL.revokeObjectURL(urlObj); reject(new Error('Vídeo inválido')); return }

      // Reduz mantendo proporção (cabe em 1920x1080), nunca aumenta
      const escala = Math.min(1920 / w, 1080 / h, 1)
      w = Math.round(w * escala); h = Math.round(h * escala)
      w -= w % 2; h -= h % 2 // dimensões pares (exigência dos codecs)

      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(urlObj); reject(new Error('Canvas indisponível')); return }

      const stream = canvas.captureStream(30)
      let mime = 'video/webm'
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) mime = 'video/mp4;codecs=avc1'
      else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mime = 'video/webm;codecs=vp9'

      let foiCancelado = false
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 })
      const chunks: BlobPart[] = []
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
      recorder.onstop = () => {
        URL.revokeObjectURL(urlObj)
        if (foiCancelado) reject(new Error('cancelado'))
        else resolve(new Blob(chunks, { type: mime.split(';')[0] }))
      }

      const limite = Math.min(MAX_SEGUNDOS_CLIPE, video.duration || MAX_SEGUNDOS_CLIPE)
      const desenhar = () => {
        if (sinal?.cancelado) {
          foiCancelado = true
          video.pause()
          if (recorder.state !== 'inactive') recorder.stop()
          else { URL.revokeObjectURL(urlObj); reject(new Error('cancelado')) }
          return
        }
        if (video.ended || video.currentTime >= limite) {
          if (recorder.state !== 'inactive') recorder.stop()
          video.pause()
          return
        }
        ctx.drawImage(video, 0, 0, w, h)
        if (onProgress) onProgress(Math.min(100, (video.currentTime / limite) * 100))
        requestAnimationFrame(desenhar)
      }

      recorder.start()
      video.play().then(() => desenhar()).catch(err => { URL.revokeObjectURL(urlObj); reject(err) })
    }

    video.onerror = () => { URL.revokeObjectURL(urlObj); reject(new Error('Falha ao ler o vídeo')) }
  })
}

function NovoVideoInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tipo, setTipo] = useState<Tipo>((searchParams.get('tipo') as Tipo) || 'video')
  const [duracaoVideo, setDuracaoVideo] = useState<Duracao>((Number(searchParams.get('duracao')) as Duracao) || 30)
  const [briefing, setBriefing] = useState('')
  const [resultado, setResultado] = useState('')
  const [modeloUsado, setModeloUsado] = useState('')
  const [loading, setLoading] = useState(false)
  const [custo, setCusto] = useState<string | null>(null)
  const [arquivos, setArquivos] = useState<Arquivo[]>(() => {
    try { return JSON.parse(localStorage.getItem('filmmaker_arquivos') || '[]') } catch { return [] }
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgresso, setUploadProgresso] = useState('')
  const [uploadConcluido, setUploadConcluido] = useState(false)
  const [montando, setMontando] = useState(false)
  const [statusMontagem, setStatusMontagem] = useState('')
  const [erroMontagem, setErroMontagem] = useState('')
  const [feedbackAberto, setFeedbackAberto] = useState<'positivo' | 'negativo' | null>(null)
  const [critica, setCritica] = useState('')
  const [feedbackEnviado, setFeedbackEnviado] = useState(false)
  const [salvandoFeedback, setSalvandoFeedback] = useState(false)
  const [videoFinal, setVideoFinal] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<{ cancelado: boolean }>({ cancelado: false })
  const abortRef = useRef<AbortController | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function cancelarTudo() {
    cancelRef.current.cancelado = true
    if (abortRef.current) abortRef.current.abort()
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setUploading(false)
    setLoading(false)
    setMontando(false)
    setUploadProgresso('')
    setStatusMontagem('')
    setErroMontagem('')
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/')
    })
  }, [router])

  function estimarCusto(texto: string) {
    const inputTokens = Math.ceil(texto.length / 4)
    const outputTokens = 2048
    // Opus 4.8: $5/milhão entrada, $25/milhão saída
    const custoUSD = (inputTokens / 1_000_000) * 5 + (outputTokens / 1_000_000) * 25
    const custoBRL = custoUSD * 5.5
    return `~R$ ${custoBRL.toFixed(3)} (${inputTokens + outputTokens} tokens)`
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
    cancelRef.current.cancelado = false
    const novos: Arquivo[] = []

    for (let i = 0; i < files.length; i++) {
      if (cancelRef.current.cancelado) break
      const original = files[i]
      const ehVideo = original.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(original.name)

      try {
        let corpo: Blob = original
        let nomeEnvio = original.name
        let contentType = original.type || (ehVideo ? 'video/mp4' : 'image/jpeg')

        // 1. Comprime vídeos no navegador (reduz GBs para poucos MB)
        if (ehVideo) {
          setUploadProgresso(`Vídeo ${i + 1}/${files.length}: comprimindo ${original.name.slice(0, 20)}... 0%`)
          try {
            const blob = await comprimirVideo(original, pct => {
              setUploadProgresso(`Vídeo ${i + 1}/${files.length}: comprimindo ${original.name.slice(0, 20)}... ${pct.toFixed(0)}%`)
            }, cancelRef.current)
            corpo = blob
            contentType = blob.type.includes('mp4') ? 'video/mp4' : 'video/webm'
            const ext = contentType === 'video/mp4' ? 'mp4' : 'webm'
            nomeEnvio = original.name.replace(/\.[^.]+$/, '') + '_1080.' + ext
          } catch {
            if (cancelRef.current.cancelado) break
            setUploadProgresso(`❌ Não consegui comprimir ${original.name.slice(0, 22)} — pule este arquivo`)
            await new Promise(r => setTimeout(r, 3500))
            continue
          }
        }

        // 2. Pede URL pré-assinada ao servidor
        const presignRes = await fetch('/api/r2-presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: nomeEnvio, contentType }),
        })
        if (!presignRes.ok) {
          setUploadProgresso(`❌ Erro ao preparar upload de ${original.name}`)
          await new Promise(r => setTimeout(r, 3000))
          continue
        }
        const { uploadUrl, publicUrl } = await presignRes.json()

        // 3. Upload direto browser → Cloudflare R2
        setUploadProgresso(`Arquivo ${i + 1}/${files.length}: enviando ${original.name.slice(0, 20)}... (${(corpo.size / 1024 / 1024).toFixed(1)}MB)`)
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: corpo,
        })
        if (!uploadRes.ok) {
          setUploadProgresso(`❌ Erro no upload de ${original.name}`)
          await new Promise(r => setTimeout(r, 3000))
          continue
        }

        novos.push({ name: original.name, url: publicUrl, id: publicUrl, duracao: 5 })
        setUploadProgresso(`✅ ${novos.length}/${files.length} concluído: ${original.name.slice(0, 28)}`)
      } catch (err: any) {
        setUploadProgresso(`❌ Falha em ${original.name}: ${err.message}`)
        await new Promise(r => setTimeout(r, 3000))
      }
    }

    if (novos.length > 0) {
      setArquivos(prev => {
        const updated = [...prev, ...novos]
        localStorage.setItem('filmmaker_arquivos', JSON.stringify(updated))
        return updated
      })
      setUploadConcluido(true)
      setTimeout(() => setUploadConcluido(false), 4000)
    }
    setUploading(false)
    setUploadProgresso('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function removerArquivo(index: number) {
    setArquivos(prev => {
      const updated = prev.filter((_, i) => i !== index)
      localStorage.setItem('filmmaker_arquivos', JSON.stringify(updated))
      return updated
    })
  }

  function atualizarDuracao(index: number, duracao: number) {
    const segura = Math.max(1, Math.min(MAX_SEGUNDOS_CLIPE, duracao || 1))
    setArquivos(prev => prev.map((a, i) => i === index ? { ...a, duracao: segura } : a))
  }

  async function enviarFeedback(avaliacao: 'positivo' | 'negativo') {
    // 👎 abre o campo de crítica; 👍 também permite comentar, mas pode enviar direto
    if (feedbackAberto !== avaliacao) {
      setFeedbackAberto(avaliacao)
      return
    }
    setSalvandoFeedback(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, duracao: duracaoVideo, briefing, roteiro: resultado, avaliacao, critica }),
      })
      setFeedbackEnviado(true)
      setFeedbackAberto(null)
      setCritica('')
    } catch {
      // silencioso — não atrapalha o fluxo
    }
    setSalvandoFeedback(false)
  }

  async function gerar() {
    if (!briefing.trim()) return
    cancelRef.current.cancelado = false
    setLoading(true)
    setResultado('')
    setFeedbackEnviado(false)
    setFeedbackAberto(null)
    setCritica('')

    try {
      const controller = new AbortController()
      abortRef.current = controller
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
      setModeloUsado(data.modelo || '')
    } catch (e: any) {
      if (e.name === 'AbortError') setResultado(cancelRef.current.cancelado ? '' : 'Tempo esgotado. Tente novamente.')
      else setResultado(`Erro: ${e.message}`)
    }

    setLoading(false)
  }

  async function montarVideo() {
    if (arquivos.length === 0) return
    cancelRef.current.cancelado = false
    setMontando(true)
    setErroMontagem('')
    setVideoFinal(null)
    setStatusMontagem('Enviando para montagem...')

    const res = await fetch('/api/montar-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clips: arquivos, roteiro: resultado, titulo: briefing.slice(0, 60) })
    })

    if (!res.ok) {
      const txt = await res.text()
      setErroMontagem(`Erro: ${txt}`)
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
        clearInterval(poll); pollRef.current = null
        setVideoFinal(statusData.url)
        setStatusMontagem('Vídeo pronto!')
        setMontando(false)
      } else if (statusData.status === 'failed') {
        clearInterval(poll); pollRef.current = null
        setErroMontagem(`Falha na renderização: ${statusData.error || 'motivo não informado'}`)
        setStatusMontagem('')
        setMontando(false)
      } else {
        setStatusMontagem(`Renderizando... (${statusData.status})`)
      }
    }, 5000)
    pollRef.current = poll
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
                  <p className="text-xs mt-1 text-center px-4" style={{ color: '#999' }}>Comprimindo p/ 1080p e enviando — alguns segundos por vídeo</p>
                  <button onClick={(e) => { e.stopPropagation(); cancelarTudo() }}
                    className="mt-3 text-xs uppercase tracking-widest px-4 py-1.5 rounded-lg font-semibold"
                    style={{ background: '#c62828', color: '#fff' }}>
                    ✕ Cancelar
                  </button>
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
                  <span className="text-3xl mb-2">{arquivos.length > 0 ? '✅' : (tipo === 'video' ? '🎬' : '🖼️')}</span>
                  {arquivos.length > 0 ? (
                    <>
                      <p className="text-sm font-bold" style={{ color: '#4caf50' }}>
                        {arquivos.length} arquivo{arquivos.length > 1 ? 's' : ''} enviado{arquivos.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#999' }}>Clique para adicionar mais</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--dourado)' }}>Clique para enviar</p>
                      <p className="text-xs mt-1" style={{ color: '#999' }}>{tipo === 'video' ? 'MP4, MOV, JPG, PNG' : 'JPG, PNG, WEBP'}</p>
                    </>
                  )}
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
                        <input type="number" min={1} max={MAX_SEGUNDOS_CLIPE} value={arq.duracao}
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

        {erroMontagem && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fff0f0', border: '1px solid #f44336', color: '#c62828' }}>
            {erroMontagem}
          </div>
        )}

        <div className="flex gap-3 mb-10 flex-wrap">
          {(uploading || loading || montando) && (
            <button onClick={cancelarTudo}
              className="px-6 py-3 rounded-xl text-sm uppercase tracking-widest font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#c62828', color: '#fff' }}>
              ✕ Cancelar
            </button>
          )}
          <Link href="/projetos" className="px-6 py-3 rounded-xl text-sm uppercase tracking-widest font-semibold transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--dourado)', color: 'var(--dourado)', background: '#fff' }}>
            ☁ Vídeos em andamento
          </Link>
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
              <div>
                <h3 className="text-sm uppercase tracking-widest font-semibold" style={{ color: 'var(--verde)' }}>
                  {tipoAtual.label} — gerado pela IA
                </h3>
                {modeloUsado && (
                  <p className="text-xs mt-1" style={{ color: 'var(--dourado)' }}>
                    ✦ Gerado por {modeloUsado}
                  </p>
                )}
              </div>
              <button onClick={() => navigator.clipboard.writeText(resultado)}
                className="text-xs px-3 py-1 rounded-lg"
                style={{ border: '1px solid var(--dourado)', color: 'var(--dourado)' }}>
                Copiar tudo
              </button>
            </div>
            <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#333', fontFamily: 'Georgia, serif' }}>
              {resultado}
            </pre>

            {/* Feedback — ajuda a IA a aprender o estilo da marca */}
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--bege-dourado)' }}>
              {feedbackEnviado ? (
                <p className="text-sm text-center font-semibold" style={{ color: '#4caf50' }}>
                  ✅ Obrigado! Seu feedback foi salvo e vai ajudar a melhorar as próximas gerações.
                </p>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--verde)' }}>
                    O que achou deste {tipoAtual.label.toLowerCase()}?
                  </p>
                  <div className="flex gap-3 mb-3">
                    <button onClick={() => enviarFeedback('positivo')}
                      className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: feedbackAberto === 'positivo' ? 'var(--verde)' : '#fff',
                        color: feedbackAberto === 'positivo' ? 'var(--bege)' : 'var(--verde)',
                        border: '1px solid var(--verde)',
                      }}>
                      👍 Aprovar
                    </button>
                    <button onClick={() => enviarFeedback('negativo')}
                      className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: feedbackAberto === 'negativo' ? '#c62828' : '#fff',
                        color: feedbackAberto === 'negativo' ? '#fff' : '#c62828',
                        border: '1px solid #c62828',
                      }}>
                      👎 Precisa melhorar
                    </button>
                  </div>

                  {feedbackAberto && (
                    <div className="space-y-2">
                      <textarea value={critica} onChange={e => setCritica(e.target.value)} rows={3}
                        placeholder={feedbackAberto === 'positivo'
                          ? 'O que mais gostou? (opcional — ajuda a IA a repetir o acerto)'
                          : 'O que faltou ou ficou errado? (quanto mais detalhe, melhor a IA aprende)'}
                        className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                        style={{ borderColor: 'var(--dourado)', background: '#fff', color: '#333' }} />
                      <button onClick={() => enviarFeedback(feedbackAberto)} disabled={salvandoFeedback}
                        className="px-5 py-2 rounded-xl text-sm uppercase tracking-widest font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'var(--dourado)', color: '#fff' }}>
                        {salvandoFeedback ? 'Salvando...' : 'Enviar feedback'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function NovoVideo() {
  return (
    <Suspense>
      <NovoVideoInner />
    </Suspense>
  )
}
