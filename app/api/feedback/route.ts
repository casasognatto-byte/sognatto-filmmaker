import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { tipo, duracao, briefing, roteiro, avaliacao, critica } = await req.json()

    if (!roteiro || !avaliacao) {
      return NextResponse.json({ error: 'Roteiro e avaliação obrigatórios' }, { status: 400 })
    }

    const { error } = await supabase.from('feedback_roteiros').insert({
      tipo: tipo || 'video',
      duracao: duracao || null,
      briefing: briefing || '',
      roteiro,
      avaliacao, // 'positivo' ou 'negativo'
      critica: critica || null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
