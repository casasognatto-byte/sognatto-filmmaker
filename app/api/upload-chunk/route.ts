import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'

export const runtime = 'nodejs'

const tmpDir = path.join(os.tmpdir(), 'sognatto-uploads')

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const chunk = formData.get('chunk') as File
  const uploadId = formData.get('uploadId') as string
  const chunkIndex = Number(formData.get('chunkIndex'))
  const totalChunks = Number(formData.get('totalChunks'))
  const filename = formData.get('filename') as string
  const contentType = formData.get('contentType') as string

  if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true })

  // Salva o chunk
  const chunkBuffer = Buffer.from(await chunk.arrayBuffer())
  const chunkPath = path.join(tmpDir, `${uploadId}_${chunkIndex}`)
  await writeFile(chunkPath, chunkBuffer)

  // Se não é o último chunk, aguarda mais
  if (chunkIndex < totalChunks - 1) {
    return NextResponse.json({ received: chunkIndex + 1, total: totalChunks })
  }

  // Último chunk — monta o arquivo completo
  const buffers: Buffer[] = []
  for (let i = 0; i < totalChunks; i++) {
    const p = path.join(tmpDir, `${uploadId}_${i}`)
    buffers.push(await readFile(p))
    await unlink(p)
  }
  const fullBuffer = Buffer.concat(buffers)

  // Envia para o Creatomate
  const res = await fetch('https://api.creatomate.com/v1/assets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CREATOMATE_API_KEY}`,
      'Content-Type': contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
    body: fullBuffer,
  })

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({ done: true, id: data.id, url: data.url, name: filename })
}
