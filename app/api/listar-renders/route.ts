import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch('https://api.creatomate.com/v1/renders?limit=50', {
    headers: { 'Authorization': `Bearer ${process.env.CREATOMATE_API_KEY}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Erro ao listar renders' }, { status: 500 })
  }

  const data = await res.json()
  const renders = (Array.isArray(data) ? data : []).map((r: any) => ({
    id: r.id,
    status: r.status,
    url: r.url || null,
    created_at: r.created_at,
    error_message: r.error_message || null,
  }))

  return NextResponse.json({ renders })
}
