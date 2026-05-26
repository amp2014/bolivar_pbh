import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 1. Verify JWT
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  // 2. Validate inputs
  const { filename, contentType } = req.body ?? {}
  if (!filename || typeof filename !== 'string' || !filename.trim()) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  if (!contentType || !contentType.startsWith('image/')) {
    return res.status(400).json({ error: 'Invalid content type — must be image/*' })
  }

  // 3. Generate date-organized key
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const r2Key = `photos/${year}/${month}/${randomUUID()}-${sanitizeFilename(filename)}`

  // 4-5. Generate presigned URL
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2Key,
      ContentType: contentType,
    })
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`

    return res.status(200).json({ uploadUrl, r2Key, publicUrl })
  } catch (err) {
    console.error('Presign error:', err)
    return res.status(500).json({ error: 'Upload initialization failed' })
  }
}
