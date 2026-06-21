import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const renderId = searchParams.get('id')

  if (!renderId) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  }

  const res = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
    headers: { 'Authorization': `Bearer ${process.env.CREATOMATE_API_KEY}` },
  })

  const data = await res.json()
  return NextResponse.json({ status: data.status, url: data.url, error: data.error_message })
}
