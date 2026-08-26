import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

// GET /api/users - Fetch all users
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = adminClient()

  const { data, error } = await db.from('user_profiles').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// PATCH /api/users - Approve, reject, or update a user
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'missing id or status' }, { status: 400 })

  const db = adminClient()

  // Update profile status
  const { data, error } = await db.from('user_profiles').update({ status }).eq('id', id).select().single()
  
  // If rejected/deleted, we might also want to delete the auth user? For now just mark as rejected.
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
