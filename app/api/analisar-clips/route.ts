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
    text: `Você é um editor de vídeo sênior da Casa Sognatto, marca premium de móveis e decoração de alto padrão.

MISSÃO: Criar a sequência de clips que conta EXATAMENTE a história do roteiro abaixo, usando o material visual disponível.

━━━ ROTEIRO (siga à risca) ━━━
${roteiro || '(Não fornecido — use julgamento visual premium)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DURAÇÃO TOTAL DO VÍDEO: ${duracao} segundos

REGRAS OBRIGATÓRIAS:
1. Cada clip tem até 15 segundos. Os frames mostram o que acontece em 3 momentos desse clip (timestamps indicados).
2. O "inicio" e "fim" que você definir devem estar DENTRO do intervalo dos frames mostrados — não invente conteúdo que não viu.
3. Use o frame do timestamp mais próximo para decidir onde cortar. Ex: se o melhor frame é em 7.5s, use inicio≈6, fim≈11.
4. O roteiro define a ORDEM das cenas — respeite-o rigorosamente. Não reordene por preferência estética.
5. Prefira cenas bem iluminadas, estáveis, sem obstáculos no enquadramento.
6. A soma das durações (fim-inicio de cada clip) deve ser próxima de ${duracao}s.
7. É melhor usar MENOS clips bem cortados do que muitos clips mal aproveitados.

Responda APENAS com JSON válido:
{
  "sequencia": [
    {
      "nome": "nome-exato-do-arquivo.ext",
      "url": "url-exata-do-clip",
      "inicio": 3.0,
      "fim": 9.0,
      "descricao": "qual cena do roteiro este clip representa e por quê"
    }
  ],
  "justificativa": "como a sequência conta a história do roteiro"
}`
  })

  for (const clip of clips) {
    const isPhoto = clip.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)
    const clipFrames: { timestamp: number; base64: string }[] = frames?.[clip.name] || []

    content.push({
      type: 'text',
      text: `\n═══ ${isPhoto ? 'FOTO' : 'VÍDEO'}: ${clip.name}\nURL: ${clip.url} ═══`
    })

    if (isPhoto) {
      // Foto: envia a imagem diretamente (sem frames — ela é o frame)
      if (clipFrames.length > 0) {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: clipFrames[0].base64 }
        })
      }
      // Para fotos, inicio e fim não fazem sentido — use 0 e a duração desejada
      content.push({ type: 'text', text: '(é uma foto — use inicio: 0, fim: igual à duração que desejar para ela, entre 3 e 6 segundos)' })
    } else {
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
