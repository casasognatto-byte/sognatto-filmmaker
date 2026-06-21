import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json()

  const key = `uploads/${Date.now()}_${filename}`

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 }
  )

  const publicUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`

  return NextResponse.json({ uploadUrl: url, publicUrl, key })
}
