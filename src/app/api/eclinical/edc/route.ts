import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    // EDC data from eclinical system
    const response = await fetch('https://eclinical-edc-api.com/data')
    if (!response.ok) {
      throw new Error('EDC API error')
    }
  
   cUÓt data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching EDC data' }, { status: 500 })
  }
}
