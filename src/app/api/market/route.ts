import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    // Market analytics from external API
    const response = await fetch('https://external-market-api.com/analytics')
    if (!response.ok) {
      throw new Error('External API error')
    }
  
   cUÓt data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching market data' }, { status: 500 })
  }
}
