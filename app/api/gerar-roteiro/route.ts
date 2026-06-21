import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BRAND = `
Marca: Casa Sognatto
Slogan oficial: "Casa Sognatto: o luxo está no singular"
Frase de branding: "Sua casa é o melhor lugar do mundo"
Instagram: @casasognatto
Tom de voz: acolhedor, refinado, elegante. Fala de emoções, desejos e afetos — nunca de produto frio.
IMPORTANTE: use sempre "ambientes planejados", NUNCA "móveis planejados".
Palavras-chave da marca: singular, acolhimento, identidade, desejo, encontro, sofisticação, lugar, sonho.
`

export async function POST(req: NextRequest) {
  const { briefing, tipo, duracaoVideo } = await req.json()
  const duracao = duracaoVideo || 30

  if (!briefing) {
    return NextResponse.json({ error: 'Briefing obrigatório' }, { status: 400 })
  }

  let prompt = ''

  if (tipo === 'video') {
    const formatoRoteiro = duracao <= 60
      ? `Formato para vídeo curto (${duracao}s):
[CENA X — Xs a Ys]
Visual: ...
Narração: ...
(repita para cada cena)
[ENCERRAMENTO]
Visual: ...
Texto na tela: ...`
      : duracao === 180
      ? `Formato para vídeo de 3 minutos — divida em 3 blocos:
[BLOCO 1 — ABERTURA (0s a 45s)]
Visual: ... | Narração: ...
[BLOCO 2 — DESENVOLVIMENTO (45s a 2min15s)]
Visual: ... | Narração: ...
[BLOCO 3 — ENCERRAMENTO E CTA (2min15s a 3min)]
Visual: ... | Narração: ...
Texto na tela: ...`
      : `Formato para vídeo institucional longo (5–10 min) — divida em capítulos:
[CAPÍTULO 1 — ABERTURA (0:00 a 0:45)]
Visual: ... | Narração: ...
[CAPÍTULO 2 — HISTÓRIA DA MARCA (0:45 a 2:00)]
Visual: ... | Narração: ...
[CAPÍTULO 3 — PRODUTOS / AMBIENTES (2:00 a 5:00)]
Visual: ... | Narração: ...
[CAPÍTULO 4 — DEPOIMENTOS / BASTIDORES (5:00 a 7:30)]
Visual: ... | Narração: ...
[CAPÍTULO 5 — ENCERRAMENTO E CTA (7:30 a fim)]
Visual: ... | Narração: ...
Texto na tela: ...`

    const plataforma = duracao <= 60 ? 'Instagram' : 'YouTube'

    prompt = `Você é o assistente de criação de vídeos da Casa Sognatto.
${BRAND}

Com base no briefing abaixo, gere:

1. ROTEIRO DO VÍDEO
${formatoRoteiro}

2. LEGENDAS PARA ${plataforma} (3 opções)
${duracao <= 60
  ? `- Legenda 1 (emocional, 3-4 linhas)
- Legenda 2 (storytelling, 4-5 linhas)
- Legenda 3 (curta e impactante, 1-2 linhas)
Cada legenda termina com o slogan ou frase de branding.`
  : `- Descrição 1 (foco em SEO — inclua palavras-chave naturalmente)
- Descrição 2 (storytelling da marca — emocional e envolvente)
- Descrição 3 (direta e informativa — lista os tópicos do vídeo)
Inclua o slogan ao final de cada descrição.`}

3. HASHTAGS / TAGS (30 ${duracao <= 60 ? 'hashtags' : 'tags para YouTube'})
Mix de: marca própria + nicho + localização + tendência

Briefing: ${briefing}`
  }

  if (tipo === 'post-estatico') {
    prompt = `Você é o assistente de criação de conteúdo da Casa Sognatto.
${BRAND}

Com base no briefing abaixo, crie um POST ESTÁTICO para Instagram:

1. TEXTO PRINCIPAL DA IMAGEM (máximo 8 palavras, impactante, fonte grande)
2. SUBTEXTO DA IMAGEM (opcional, máximo 12 palavras)
3. LEGENDA DO POST (3 opções — curta, média e longa)
4. HASHTAGS (25 hashtags)
5. SUGESTÃO VISUAL: descreva a foto/arte ideal para este post (cores, composição, elementos)

Briefing: ${briefing}`
  }

  if (tipo === 'carrossel') {
    prompt = `Você é o assistente de criação de conteúdo da Casa Sognatto.
${BRAND}

Com base no briefing abaixo, crie um CARROSSEL para Instagram com 5 a 7 slides:

Para cada slide:
[SLIDE X]
Título: (máximo 6 palavras)
Texto: (máximo 3 linhas)
Visual sugerido: (descrição breve da imagem/arte)

Depois:
LEGENDA DO POST (para acompanhar o carrossel — 3 opções)
HASHTAGS (25 hashtags)
CALL TO ACTION DO ÚLTIMO SLIDE (frase para engajar)

Briefing: ${briefing}`
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  })

  const resultado = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ resultado })
}
