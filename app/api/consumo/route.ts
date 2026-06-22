import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const LIMITE_PLANO = 2000 // créditos/mês do plano Essential

export async function GET() {
  try {
    // Início do mês atual
    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    const { data, error } = await supabase
      .from('renders_log')
      .select('creditos, duracao, created_at')
      .gte('created_at', inicioMes)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const creditosUsados = (data || []).reduce((acc, r) => acc + (r.creditos || 0), 0)
    const totalVideos = (data || []).length
    const segundosTotais = (data || []).reduce((acc, r) => acc + (r.duracao || 0), 0)

    return NextResponse.json({
      creditosUsados,
      creditosRestantes: Math.max(0, LIMITE_PLANO - creditosUsados),
      limite: LIMITE_PLANO,
      totalVideos,
      segundosTotais,
      mes: agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
