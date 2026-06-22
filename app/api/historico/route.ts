import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Essential plan: $25/mês ÷ 2000 créditos = $0,0125 por crédito
const CUSTO_POR_CREDITO_USD = 25 / 2000
const USD_BRL = 5.5

export async function GET() {
  const { data, error } = await supabase
    .from('renders_log')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const meses: Record<string, {
    mes: string
    chave: string
    creditos: number
    custo_brl: number
    videos: {
      titulo: string
      creditos: number
      custo_brl: number
      duracao: number
      created_at: string
    }[]
  }> = {}

  for (const r of (data || [])) {
    const dt = new Date(r.created_at)
    const chave = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    const mes = dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    if (!meses[chave]) meses[chave] = { mes, chave, creditos: 0, custo_brl: 0, videos: [] }

    const creditos = r.creditos || 0
    meses[chave].creditos += creditos
    meses[chave].custo_brl += creditos * CUSTO_POR_CREDITO_USD * USD_BRL
    meses[chave].videos.push({
      titulo: r.titulo || 'Sem título',
      creditos,
      custo_brl: creditos * CUSTO_POR_CREDITO_USD * USD_BRL,
      duracao: r.duracao || 0,
      created_at: r.created_at,
    })
  }

  return NextResponse.json({ meses: Object.values(meses) })
}
