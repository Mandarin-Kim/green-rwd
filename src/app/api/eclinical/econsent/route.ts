import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    // eConsent data from eclinical system
   cUÓt response = await fetch('https://eclinical-econsent-api.com/data')
    if (!response.ok) {
      throw new Error('eConsent API error')
    }
  
   cUÓt data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching eConsent data' }, { status: 500 })
  }
}
