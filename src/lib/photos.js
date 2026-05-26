import { supabase } from './supabase'

export async function getUploadUrl({ filename, contentType, token }) {
  const res = await fetch('/api/get-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filename, contentType }),
  })
  if (!res.ok) throw new Error('Failed to get upload URL')
  return res.json() // { uploadUrl, r2Key, publicUrl }
}

export async function uploadToR2(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) throw new Error('R2 upload failed')
}

export async function savePhotoMetadata({ r2Key, publicUrl, filename, fileSize, contentType, caption, uploaderId, uploaderName }) {
  const { error } = await supabase.from('photos').insert({
    r2_key: r2Key,
    public_url: publicUrl,
    filename,
    file_size: fileSize,
    content_type: contentType,
    caption: caption || null,
    uploader_id: uploaderId,
    uploader_name: uploaderName,
  })
  if (error) throw error
}

export async function fetchPhotos({ limit = 60, before = null } = {}) {
  let q = supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) q = q.lt('created_at', before)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function deletePhoto(photoId, r2Key, token) {
  const res = await fetch('/api/delete-photo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ photoId, r2Key }),
  })
  if (!res.ok) throw new Error('Delete failed')
}
