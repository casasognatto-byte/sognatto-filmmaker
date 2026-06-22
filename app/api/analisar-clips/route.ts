import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { clips, frames, roteiro, duracao } = await req.json()

  if (!clips || clips.length === 0) {
    return NextResponse.json({ error: 'Clips obrigatórios' }, { status: 400 })
  }

  const content: Anthropic.MessageParam['content'] = []

  content.push({
    type: 'text',
    text: `Você é um editor de vídeo profissional da Casa Sognatto, marca premium de móveis e decoração de alto padrão.

Seu trabalho: analisar frames de ${clips.length} clipe(s) de vídeo e definir a sequência ideal para um vídeo de marketing de ${duracao} segundos.

ROTEIRO APROVADO:
${roteiro || '(Não fornecido — use seu julgamento visual e o posicionamento premium da marca)'}

CRITÉRIOS DE SELEÇÃO:
- Prefira cenas com boa iluminação, composição limpa e apelo visual premium
- Evite frames borrados, mal enquadrados ou com conteúdo repetitivo
- Construa narrativa visual: abertura impactante → desenvolvimento → fechamento elegante
- A transição entre clipes deve ser fluida (o fim de um complementa o início do próximo)
- Distribua a duração total (${duracao}s) proporcionalmente entre os clipes selecionados

Para cada clipe abaixo você verá 3 frames capturados em momentos distintos (20%, 50% e 80% da duração do clipe comprimido, que tem até 15 segundos).

Responda APENAS com JSON válido neste formato exato:
{
  "sequencia": [
    {
      "nome": "nome-exato-do-arquivo.ext",
      "url": "url-exata-do-clip",
      "inicio": 0,
      "fim": 8,
      "descricao": "motivo da escolha e posição na narrativa"
    }
  ],
  "justificativa": "visão geral das escolhas editoriais"
}`
  })

  for (const clip of clips) {
    const clipFrames: { timestamp: number; base64: string }[] = frames?.[clip.name] || []

    content.push({
      type: 'text',
      text: `\n═══ CLIPE: ${clip.name}\nURL: ${clip.url} ═══`
    })

    if (clipFrames.length === 0) {
      content.push({ type: 'text', text: '(frames não disponíveis para este clipe)' })
      continue
    }

    for (const frame of clipFrames) {
      content.push({ type: 'text', text: `Frame em ${frame.timestamp.toFixed(1)}s:` })
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: frame.base64 }
      })
    }
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [{ role: 'user', content }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Resposta IA sem JSON:', text)
      return NextResponse.json({ error: 'IA não retornou JSON válido' }, { status: 500 })
    }

    const resultado = JSON.parse(jsonMatch[0])
    return NextResponse.json(resultado)
  } catch (err: any) {
    console.error('Erro na análise de clips:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
