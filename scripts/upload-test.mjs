import { readFileSync, statSync } from 'fs'
import { basename } from 'path'

const CREATOMATE_KEY = 'f0a8c875-1c14-45f4-bdf0-c846d2ad1e27'
const CHUNK_SIZE = 50 * 1024 * 1024 // 50MB por chunk — Creatomate aceita até esse tamanho

const videos = [
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621061449_0011_D.MP4',  // 110MB
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621065046_0007_D.MP4',  // 246MB
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621061502_0012_D.MP4',  // 313MB
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621061532_0013_D.MP4',  // 380MB
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621063831_0005_D.MP4',  // 906MB
]

async function uploadFile(filePath) {
  const filename = basename(filePath)
  const buffer = readFileSync(filePath)
  const size = buffer.length
  console.log(`\n📤 Enviando ${filename} (${(size/1024/1024).toFixed(0)}MB)...`)

  // Tenta upload direto primeiro
  const res = await fetch('https://api.creatomate.com/v1/assets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CREATOMATE_KEY}`,
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
    body: buffer,
  })

  if (res.ok) {
    const data = await res.json()
    console.log(`✅ ${filename} → ${data.id}`)
    return { id: data.id, url: data.url, name: filename }
  } else {
    const err = await res.text()
    console.log(`❌ Erro: ${res.status} ${err.slice(0,100)}`)
    return null
  }
}

async function gerarRoteiro() {
  console.log('\n🎬 Gerando roteiro com IA...')

  const briefing = `Quero um vídeo que comece com o nascer do sol atrás da bandeira do brasil flamulando, passe pelos takes aéreos do nascer do sol e da rodovia. Mostre o caminhão chegando na cidade. Enfatize os vídeos com cenas na rotatória onde tem uma escultura de letras da cidade Campo Grande. Há take com o caminhão passando atrás. Também há take do caminhão passando por trás da estátua do homem maçon, com o sol nascendo atrás, e o drone subindo para fazer um aéreo. Depois finalize com o caminhão entrando na rua (use o zoom se necessário) e o drone passando pela lateral e com o take do aéreo partindo da lateral do caminhão e filmando a cidade. Retire os fios de energia da cena.`

  // Lê chave do .env.local
  const envContent = readFileSync('C:\\Users\\davin\\Documents\\sognatto-filmmaker\\.env.local', 'utf8')
  const anthropicKey = envContent.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Você é um diretor de vídeo profissional. Gere um roteiro para vídeo de 30 segundos. Inclua: cenas com timing (0:00-0:05), clima/música sugerida, legendas e hashtags Instagram. Briefing: ${briefing}`
      }]
    })
  })

  const data = await res.json()
  return data.content?.[0]?.text || 'Erro ao gerar roteiro'
}

async function montarVideo(assetIds) {
  console.log('\n🎞️  Montando vídeo no Creatomate...')

  const clips = assetIds.map(({ url }) => ({
    type: 'video',
    source: url,
    fit: 'cover',
    duration: 6,
  }))

  // Adiciona tela final com marca
  clips.push({
    type: 'composition',
    duration: 3,
    elements: [
      { type: 'rectangle', width: '100%', height: '100%', fill_color: '#233022' },
      { type: 'text', text: 'CASA SOGNATTO', y: '45%', font_family: 'Montserrat', font_size: 48, font_weight: '700', fill_color: '#a18c6a', letter_spacing: 8 },
      { type: 'text', text: 'casasognatto.com.br', y: '58%', font_family: 'Montserrat', font_size: 22, fill_color: '#efebdf' },
    ]
  })

  const body = {
    output_format: 'mp4',
    width: 1080,
    height: 1920,
    frame_rate: 30,
    elements: [{
      type: 'composition',
      track: 1,
      elements: clips,
    }]
  }

  const res = await fetch('https://api.creatomate.com/v1/renders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CREATOMATE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  if (Array.isArray(data) && data[0]?.id) {
    console.log(`✅ Render iniciado: ${data[0].id}`)
    console.log(`🔗 Acompanhe em: https://creatomate.com/projects/f2651926-fe16-4cf0-9ec0-2abd0e30f4f9/renders`)
    return data[0]
  } else {
    console.log('❌ Erro ao montar:', JSON.stringify(data).slice(0, 200))
    return null
  }
}

// MAIN
console.log('🚀 Iniciando teste de produção de vídeo — Casa Sognatto Filmmaker')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// Gera roteiro
const roteiro = await gerarRoteiro()
console.log('\n📋 ROTEIRO GERADO:')
console.log('─────────────────')
console.log(roteiro)

// Faz upload dos vídeos
console.log('\n📁 INICIANDO UPLOADS:')
console.log('─────────────────────')
const assets = []
for (const video of videos) {
  const asset = await uploadFile(video)
  if (asset) assets.push(asset)
}

console.log(`\n✅ ${assets.length}/${videos.length} vídeos enviados`)

if (assets.length > 0) {
  const render = await montarVideo(assets)
  if (render) {
    console.log('\n🎬 VÍDEO EM PRODUÇÃO!')
    console.log(`ID: ${render.id}`)
    console.log(`Status: ${render.status}`)
  }
}
