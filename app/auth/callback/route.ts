import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'
  const sessionId = searchParams.get('session_id')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('hosts').upsert(
        { id: user.id, email: user.email },
        { onConflict: 'id' }
      )
    }
  }

  const redirectUrl = sessionId ? `${origin}${next}?session_id=${sessionId}` : `${origin}${next}`
  return NextResponse.redirect(redirectUrl)
}
