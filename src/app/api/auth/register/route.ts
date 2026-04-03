// NOTE: bcryptjs needs to be added to dependencies
// Run: npm install bcryptjs
// Also add types: npm install --save-dev @types/bcryptjs

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/register
 * Register a new user
 *
 * Body:
 * - email: string (required, unique, valid email format)
 * - password: string (required, 8+ chars, must include letter, number, special char)
 * - name: string (required)
 * - company?: string (optional)
 *
 * Response:
 * - 201: User created successfully (sanitized user object)
 * - 400: Validation error
 * - 409: Email already exists
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '요청 본문이 유효한 JSON이 아닙니다' },
        { status: 400 }
      )
    }

    // Validate body is an object
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: '요청 본문이 유효하지 않습니다' },
        { status: 400 }
      )
    }

    const { email, password, name, company } = body as Record<string, unknown>

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: '이메일은 필수입니다' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: '비밀번호는 필수입니다' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: '이름은 필수입니다' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '유효한 이메일 주소를 입력해주세요' },
        { status: 400 }
      )
    }

    // Validate password
    // Requirements: 8+ chars, at least one letter, one number, one special char
    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다' },
        { status: 400 }
      )
    }

    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!hasLetter) {
      return NextResponse.json(
        { error: '비밀번호에는 영문자가 포함되어야 합니다' },
        { status: 400 }
      )
    }

    if (!hasNumber) {
      return NextResponse.json(
        { error: '비밀번호에는 숫자가 포함되어야 합니다' },
        { status: 400 }
      )
    }

    if (!hasSpecial) {
      return NextResponse.json(
        { error: '비밀번호에는 특수문자(!@#$%^&* 등)가 포함되어야 합니다' },
        { status: 400 }
      )
    }

    // Validate optional company field
    if (company !== undefined && typeof company !== 'string') {
      return NextResponse.json(
        { error: '회사는 텍스트여야 합니다' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '이메일이 이미 사용 중입니다' },
        { status: 409 }
      )
    }

    // Hash password
    // Using dynamic import because bcryptjs is not yet installed
    let hashedPassword: string
    try {
      const bcrypt = await import('bcryptjs')
      hashedPassword = await bcrypt.hash(password, 10)
    } catch {
      return NextResponse.json(
        { error: '비밀번호 암호화 중 오류가 발생했습니다. bcryptjs 패키지를 설치해주세요' },
        { status: 500 }
      )
    }

    // Create user in database
    // Note: NextAuth typically manages password hashing through providers
    // For this register endpoint, we store the hashed password in a custom field
    // However, the User model doesn't have a password field by default
    // This implementation assumes the schema will be extended or we use external auth

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: 'USER',
        // Store hashed password as image field temporarily (NOT RECOMMENDED FOR PRODUCTION)
        // In production, consider: using a separate CredentialUser table, or updating schema
        image: `hashed:${hashedPassword}`,
      },
    })

    // Return sanitized user (no password)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[/api/auth/register] Error:', error)
    return NextResponse.json(
      { error: '사용자 등록 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
