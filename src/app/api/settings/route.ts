import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    // Return user settings
    const settings = {
      theme: 'light',
      language: 'ko',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      timezone: 'Asia/Seoul',
    }
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    // In production, save to database
    return NextResponse.json({ message: 'Settings updated', ...body })
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
