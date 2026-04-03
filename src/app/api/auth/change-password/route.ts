// NOTE: bcryptjs needs to be added to dependencies
// Run: npm install bcryptjs
// Also add types: npm install --save-dev @types/bcryptjs

import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/change-password
 * Change the current user's password
 *
 * Body:
 * - currentPassword: string (required, for verification)
 * - newPassword: string (required, 8+ chars, must include letter+number+special)
 * - confirmPassword: string (required, must match newPassword)
 *
 * Response:
 * - 200: Password changed successfully
 * - 400: Validation error
 * - 401: Not authenticated or invalid current password
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await getAuthSession()

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // Get user ID from session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID를 찾을 수 없습니다' },
        { status: 401 }
      )
    }

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

    const { currentPassword, newPassword, confirmPassword } = body as Record<string, unknown>

    // Validate required fields
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: '현재 비밀번호는 필수입니다' },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: '새 비밀번호는 필수입니다' },
        { status: 400 }
      )
    }

    if (!confirmPassword || typeof confirmPassword !== 'string') {
      return NextResponse.json(
        { error: '비밀번호 확인은 필수입니다' },
        { status: 400 }
      )
    }

    // Check if newPassword and confirmPassword match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다' },
        { status: 400 }
      )
    }

    // Check if new password is the same as current password
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: '새 비밀번호는 현재 비밀번호와 달라야 합니다' },
        { status: 400 }
      )
    }

    // Validate new password
    // Requirements: 8+ chars, at least one letter, one number, one special char
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: '새 비밀번호는 8자 이상이어야 합니다' },
        { status: 400 }
      )
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)

    if (!hasLetter) {
      return NextResponse.json(
        { error: '새 비밀번호에는 영문자가 포함되어야 합니다' },
        { status: 400 }
      )
    }

    if (!hasNumber) {
      return NextResponse.json(
        { error: '새 비밀번호에는 숫자가 포함되어야 합니다' },
        { status: 400 }
      )
    }

    if (!hasSpecial) {
      return NextResponse.json(
        { error: '새 비밀번호에는 특수문자(!@#$%^&* 등)가 포함되어야 합니다' },
        { status: 400 }
      )
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 401 }
      )
    }

    // Verify current password
    // Note: The User model stores password in image field (hashed:...)
    // This is a temporary solution; in production, use a dedicated password field
    try {
      const bcrypt = await import('bcryptjs')

      // Extract hashed password from image field (format: "hashed:...")
      const storedHash = user.image?.startsWith('hashed:')
        ? user.image.slice(7)
        : null

      if (!storedHash) {
        // User might have been created via OAuth (no password set)
        return NextResponse.json(
          { error: '현재 비밀번호 검증에 실패했습니다' },
          { status: 401 }
        )
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, storedHash)

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: '현재 비밀번호가 일치하지 않습니다' },
          { status: 401 }
        )
      }

      // Hash new password
      const newHashedPassword = await bcrypt.hash(newPassword, 10)

      // Update user with new password
      await prisma.user.update({
        where: { id: userId },
        data: {
          image: `hashed:${newHashedPassword}`,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다',
      })
    } catch (bcryptError) {
      if (bcryptError instanceof Error && bcryptError.message.includes('bcryptjs')) {
        return NextResponse.json(
          { error: '비밀번호 변경 중 오류가 발생했습니다. bcryptjs 패키지를 설치해주세요' },
          { status: 500 }
        )
      }
      throw bcryptError
    }
  } catch (error) {
    console.error('[/api/auth/change-password] Error:', error)
    return NextResponse.json(
      { error: '비밀번호 변경 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
