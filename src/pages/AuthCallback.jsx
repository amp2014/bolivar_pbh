import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        upsertUser(session.user).then(() => navigate('/', { replace: true }))
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '15px' }}>
        Signing you in…
      </p>
    </div>
  )
}

async function upsertUser(user) {
  const { id, email, user_metadata } = user

  // Check if user row exists so we only set role on first sign-in
  const { data: existing } = await supabase.from('users').select('id').eq('id', id).maybeSingle()

  const payload = {
    id,
    email,
    display_name: user_metadata?.full_name ?? email,
    avatar_url:   user_metadata?.avatar_url ?? null,
    ...(existing ? {} : { role: 'family' }),
  }

  await supabase.from('users').upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
}
