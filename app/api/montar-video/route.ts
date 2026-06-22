import { NextRequest, NextResponse } from 'next/server'

interface Clip {
  id: string
  url: string
  name: string
  duracao: number
}

export async function POST(req: NextRequest) {
  const { clips, roteiro, titulo } = await req.json()

  if (!clips || clips.length === 0) {
    return NextResponse.json({ error: 'Clips obrigatórios' }, { status: 400 })
  }

  // Monta os elementos do vídeo — cada clip ocupa uma fatia do tempo total
  const duracaoTotal = clips.reduce((acc: number, c: Clip) => acc + (c.duracao || 5), 0)
  let tempoAtual = 0

  const elements: any[] = []

  clips.forEach((clip: Clip, i: number) => {
    const dur = clip.duracao || 5
    const isVideo = clip.name.match(/\.(mp4|mov|avi|mkv)$/i)

    elements.push({
      id: `clip_${i}`,
      type: isVideo ? 'video' : 'image',
      source: clip.url,
      time: tempoAtual,
      duration: dur,
      fit: 'cover',
    })

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
    type: 'rectangle',
    time: duracaoTotal - 4,
    duration: 4,
    x: '0%',
    y: '0%',
    width: '100%',
    height: '100%',
    fill_color: '#233022',
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
    letter_spacing: '0.3em',
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

  return NextResponse.json({ renderId: render.id, status: render.status })
}
