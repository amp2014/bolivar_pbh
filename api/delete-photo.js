import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

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

  const { photoId, r2Key } = req.body ?? {}
  if (!photoId || !r2Key) return res.status(400).json({ error: 'Missing photoId or r2Key' })

  // 2. Look up photo
  const { data: photo, error: fetchErr } = await supabase
    .from('photos')
    .select('id, uploader_id')
    .eq('id', photoId)
    .single()

  if (fetchErr || !photo) return res.status(404).json({ error: 'Photo not found' })

  // 3. Check authorization: owner or admin
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = userRow?.role === 'admin'
  const isOwner = photo.uploader_id === user.id
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' })

  // 4. Delete from R2 — best effort, don't fail the operation on R2 error
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2Key,
    }))
  } catch (r2Err) {
    console.error('[delete-photo] R2 delete failed — manual cleanup needed:', r2Key, r2Err.message)
  }

  // 5. Delete record from Supabase
  const { error: dbErr } = await supabase.from('photos').delete().eq('id', photoId)
  if (dbErr) return res.status(500).json({ error: 'Database delete failed' })

  return res.status(200).json({ success: true })
}
