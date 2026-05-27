// Run: node scripts/test-r2-presign.mjs
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Load .env manually (no dotenv dependency needed)
const env = {}
try {
  const lines = readFileSync(join(root, '.env'), 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
  }
} catch {
  console.error('Could not read .env — make sure it exists at project root')
  process.exit(1)
}

const required = ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']
const missing = required.filter(k => !env[k])
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '))
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

const now = new Date()
const year = now.getFullYear()
const month = String(now.getMonth() + 1).padStart(2, '0')
const r2Key = `photos/${year}/${month}/${randomUUID()}-test-presign-check.jpg`

console.log('Testing R2 presigned URL generation…')
console.log('Bucket:', env.R2_BUCKET_NAME)
console.log('Endpoint: https://' + env.CLOUDFLARE_ACCOUNT_ID + '.r2.cloudflarestorage.com')
console.log('Key:', r2Key)
console.log()

try {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: r2Key,
    ContentType: 'image/jpeg',
  })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  const publicUrl = `${env.R2_PUBLIC_URL}/${r2Key}`

  console.log('✅ Presign succeeded')
  console.log()
  console.log('uploadUrl (first 100 chars):', uploadUrl.slice(0, 100) + '…')
  console.log('publicUrl:', publicUrl)
  console.log()
  console.log('To complete the upload test, run:')
  console.log(`curl -X PUT "${uploadUrl}" -H "Content-Type: image/jpeg" --data-binary @<any-local-image.jpg>`)
} catch (err) {
  console.error('❌ Presign failed:', err.message)
  if (err.message.includes('InvalidAccessKeyId')) console.error('   → R2_ACCESS_KEY_ID is wrong or not activated')
  if (err.message.includes('SignatureDoesNotMatch')) console.error('   → R2_SECRET_ACCESS_KEY is wrong')
  if (err.message.includes('NoSuchBucket')) console.error('   → R2_BUCKET_NAME not found in this account')
  process.exit(1)
}
