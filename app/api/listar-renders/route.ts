import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  // Busca os últimos 30 render IDs salvos no banco
  const { data: logs, error } = await supabase
    .from('renders_log')
    .select('render_id, titulo, duracao, creditos, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!logs || logs.length === 0) {
    return NextResponse.json({ renders: [] })
  }

  // Busca o status atual de cada render no Creatomate
  const results = await Promise.all(
    logs.map(async (log) => {
      try {
        const res = await fetch(`https://api.creatomate.com/v1/renders/${log.render_id}`, {
          headers: { 'Authorization': `Bearer ${process.env.CREATOMATE_API_KEY}` },
        })
        if (!res.ok) return null
        const r = await res.json()
        return {
          id: r.id,
          status: r.status,
          url: r.url || null,
          created_at: log.created_at,
          titulo: log.titulo || null,
          duracao: log.duracao || null,
          error_message: r.error_message || null,
        }
      } catch {
        return null
      }
    })
  )

  const renders = results.filter(Boolean)
  return NextResponse.json({ renders })
}
