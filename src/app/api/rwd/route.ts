import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    // Fetch RWD data from external API (EHR, Payer, etc.)
    const response = await fetch('https://external-rwd-api.com/data')
    if (!response.ok) {
      throw new Error('External RWD API error')
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching RWD data' }, { status: 500 })
  }
}
