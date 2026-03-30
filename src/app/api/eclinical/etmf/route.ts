import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    // eTMF data from eclinical system
    const response = await fetch('https://eclinical-etmf-api.com/data')
    if (!response.ok) {
      throw new Error('eTMF API error')
    }
  
   cUÓt data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching eTMF data' }, { status: 500 })
  }
}
