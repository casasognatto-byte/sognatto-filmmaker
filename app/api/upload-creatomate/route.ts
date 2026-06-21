import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()

  const res = await fetch('https://api.creatomate.com/v1/assets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CREATOMATE_API_KEY}`,
      'Content-Type': file.type,
      'Content-Disposition': `attachment; filename="${file.name}"`,
    },
    body: buffer,
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({ id: data.id, url: data.url, name: file.name })
}
