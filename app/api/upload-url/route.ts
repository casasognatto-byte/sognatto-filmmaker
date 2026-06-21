import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json()

  const res = await fetch('https://api.creatomate.com/v1/assets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CREATOMATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename, content_type: contentType }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({ uploadUrl: data.upload_url, id: data.id, url: data.url })
}
