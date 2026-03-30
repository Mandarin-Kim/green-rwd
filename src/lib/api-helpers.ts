import { NextResponse } from 'next/server'

export function apiSuccess(code: number, data: any) {
  return NextResponse.json(data, { status: code })
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
