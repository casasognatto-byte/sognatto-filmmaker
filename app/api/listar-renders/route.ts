import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch('https://api.creatomate.com/v1/renders?limit=50', {
    headers: { 'Authorization': `Bearer ${process.env.CREATOMATE_API_KEY}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({ renders: data })
}
