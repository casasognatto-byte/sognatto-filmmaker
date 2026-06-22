import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface Clip {
  id: string
  url: string
  name: string
  duracao: number
}

interface ClipSequencia {
  nome: string
  url: string
  inicio: number
  fim: number
  descricao?: string
}

// Fórmula oficial do Creatomate: 1 crédito = 100 milhões de pixels.
// créditos = (largura × altura × fps × duração) / 100.000.000, arredondado p/ cima, mínimo 1.
function calcularCreditos(width: number, height: number, fps: number, duracao: number) {
  return Math.max(1, Math.ceil((width * height * fps * duracao) / 100_000_000))
}

export async function POST(req: NextRequest) {
  const { clips, roteiro, titulo, sequencia, duracaoAlvo } = await req.json()

  if (!clips || clips.length === 0) {
    return NextResponse.json({ error: 'Clips obrigatórios' }, { status: 400 })
  }

  // Se a IA forneceu uma sequência ordenada, usa ela; senão distribui igualmente
  let clipsParaMontar: { url: string; name: string; duracao: number; trim_start?: number }[]

  if (sequencia?.length > 0) {
    clipsParaMontar = (sequencia as ClipSequencia[]).map(s => ({
      url: s.url,
      name: s.nome,
      duracao: Math.max(1, s.fim - s.inicio),
      trim_start: s.inicio || 0,
    }))
  } else {
    // Sem análise IA: distribui a duração alvo igualmente entre os clips
    const duracaoPorClip = duracaoAlvo
      ? Math.max(1, Math.round(duracaoAlvo / clips.length))
      : 5
    clipsParaMontar = clips.map((c: Clip) => ({ ...c, duracao: duracaoPorClip }))
  }

  // Monta os elementos do vídeo — cada clip ocupa uma fatia do tempo total
  const duracaoTotal = clipsParaMontar.reduce((acc, c) => acc + c.duracao, 0)
  let tempoAtual = 0

  const elements: any[] = []

  clipsParaMontar.forEach((clip, i) => {
    const dur = clip.duracao || 5
    const isVideo = clip.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)

    const el: any = {
      id: `clip_${i}`,
      type: isVideo ? 'video' : 'image',
      source: clip.url,
      time: tempoAtual,
      duration: dur,
      fit: 'cover',
      x: '50%',
      y: '50%',
      width: '100%',
      height: '100%',
      x_alignment: '50%',
      y_alignment: '50%',
    }

    if (clip.trim_start !== undefined && clip.trim_start > 0) {
      el.trim_start = clip.trim_start
    }

    // Transição suave: fade in no início, fade out no fim de cada clip
    const fadeDur = Math.min(0.6, dur * 0.15)
    el.animations = [
      { easing: 'linear', type: 'fade', fade: 'in',  time: 0,           duration: fadeDur },
      { easing: 'linear', type: 'fade', fade: 'out', time: dur - fadeDur, duration: fadeDur },
    ]

    elements.push(el)
    tempoAtual += dur
  })

  // Texto do título no início
  if (titulo) {
    elements.push({
      id: 'titulo',
      type: 'text',
      text: titulo,
      time: 0,
      duration: 3,
      x: '50%',
      y: '85%',
      width: '80%',
      font_family: 'Georgia',
      font_size: '5 vmin',
      fill_color: '#ffffff',
      font_weight: '300',
      x_alignment: '50%',
      background_color: 'rgba(35,48,34,0.6)',
      background_x_padding: '4%',
      background_y_padding: '2%',
      background_border_radius: 8,
    })
  }

  // Logo Casa Sognatto no encerramento
  elements.push({
    id: 'encerramento_bg',
    type: 'shape',
    time: duracaoTotal - 4,
    duration: 4,
    x: '50%',
    y: '50%',
    width: '100%',
    height: '100%',
    fill_color: '#233022',
    path: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
  })

  elements.push({
    id: 'logo_texto',
    type: 'text',
    text: 'CASA SOGNATTO',
    time: duracaoTotal - 4,
    duration: 4,
    x: '50%',
    y: '42%',
    width: '80%',
    font_family: 'Georgia',
    font_size: '7 vmin',
    fill_color: '#efebdf',
    font_weight: '700',
    x_alignment: '50%',
    letter_spacing: '20%',
    animations: [{ easing: 'linear', type: 'fade', fade: 'in', time: 0, duration: 1 }],
  })

  elements.push({
    id: 'slogan',
    type: 'text',
    text: 'O luxo está no singular.',
    time: duracaoTotal - 3,
    duration: 3,
    x: '50%',
    y: '55%',
    width: '80%',
    font_family: 'Georgia',
    font_size: '3 vmin',
    fill_color: '#a18c6a',
    font_weight: '300',
    x_alignment: '50%',
    font_style: 'italic',
    animations: [{ easing: 'linear', type: 'fade', fade: 'in', time: 0, duration: 1 }],
  })

  elements.push({
    id: 'site',
    type: 'text',
    text: 'casasognatto.com.br',
    time: duracaoTotal - 2,
    duration: 2,
    x: '50%',
    y: '65%',
    width: '80%',
    font_family: 'Georgia',
    font_size: '2 vmin',
    fill_color: '#efebdf',
    font_weight: '300',
    x_alignment: '50%',
  })

  const payload = {
    source: {
      output_format: 'mp4',
      width: 1080,
      height: 1920,
      frame_rate: 30,
      elements,
    },
  }

  const res = await fetch('https://api.creatomate.com/v1/renders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CREATOMATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const data = await res.json()
  const render = Array.isArray(data) ? data[0] : data

  // Registra o render no banco para acompanhar o consumo de créditos
  const creditos = calcularCreditos(1080, 1920, 30, duracaoTotal)
  await supabase.from('renders_log').insert({
    render_id: render.id,
    width: 1080,
    height: 1920,
    frame_rate: 30,
    duracao: duracaoTotal,
    creditos,
    titulo: titulo || null,
  }).then(({ error }) => {
    if (error) console.error('Erro ao registrar render:', error.message)
  })

  return NextResponse.json({ renderId: render.id, status: render.status })
}
