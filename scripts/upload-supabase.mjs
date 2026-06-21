import { createClient } from '@supabase/supabase-js'
import { readFileSync, statSync } from 'fs'
import { basename } from 'path'

const SUPABASE_URL = 'https://cfubnwxzuqgvmsxsfrau.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const CREATOMATE_KEY = 'f0a8c875-1c14-45f4-bdf0-c846d2ad1e27'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Vídeos menores para o teste de 30s (5 clips de 6s cada)
const videos = [
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621061449_0011_D.MP4',  // 110MB
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621065046_0007_D.MP4',  // 246MB
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621061502_0012_D.MP4',  // 313MB
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621061532_0013_D.MP4',  // 380MB
  'C:\\Users\\davin\\Videos\\Drone DJI\\DJI_001\\DJI_20260621061311_0010_D.MP4',  // 486MB
]

async function criarBucket() {
  const { error } = await supabase.storage.createBucket('videos', { public: true })
  if (error && !error.message.includes('already exists')) {
    console.log('Bucket error:', error.message)
  } else {
    console.log('✅ Bucket "videos" pronto')
  }
}

async function uploadParaSupabase(filePath) {
  const filename = basename(filePath)
  const size = statSync(filePath).size
  console.log(`\n📤 ${filename} (${(size/1024/1024).toFixed(0)}MB)...`)

  const buffer = readFileSync(filePath)

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(`filmmaker/${filename}`, buffer, {
      contentType: 'video/mp4',
      upsert: true,
    })

  if (error) {
    console.log(`❌ Erro: ${error.message}`)
    return null
  }

  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(`filmmaker/${filename}`)

  console.log(`✅ URL: ${urlData.publicUrl}`)
  return urlData.publicUrl
}

async function montarVideo(urls) {
  console.log('\n🎞️  Montando vídeo no Creatomate...')

  const elements = urls.map(url => ({
    type: 'video',
    source: url,
    fit: 'cover',
    duration: 5,
    time: 'auto',
  }))

  // Tela final Casa Sognatto
  elements.push({
    type: 'composition',
    duration: 3,
    time: 'auto',
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
      elements,
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
    console.log(`\n✅ RENDER INICIADO!`)
    console.log(`ID: ${data[0].id}`)
    console.log(`Status: ${data[0].status}`)
    console.log(`🔗 Veja em: https://creatomate.com/projects/f2651926-fe16-4cf0-9ec0-2abd0e30f4f9/renders`)
    return data[0]
  } else {
    console.log('❌ Erro ao montar:', JSON.stringify(data).slice(0, 300))
    return null
  }
}

// MAIN
console.log('🚀 Casa Sognatto Filmmaker — Teste de Produção')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await criarBucket()

const urls = []
for (const v of videos) {
  const url = await uploadParaSupabase(v)
  if (url) urls.push(url)
}

console.log(`\n✅ ${urls.length}/${videos.length} vídeos no Supabase`)

if (urls.length > 0) {
  await montarVideo(urls)
}
