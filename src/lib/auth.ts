import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth/next'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '이메일', type: 'email', placeholder: 'user@green-ribbon.co.kr' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('이메일과 비밀번호를 입력해주세요.')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('등록되지 않은 이메일입니다.')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          throw new Error('비밀번호가 올바르지 않습니다.')
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24시간
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string
        ;(session.user as { role: string }).role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// 서버 세션 조회
export const getAuthSession = () => getServerSession(authOptions)

// 권한 검증
export async function requireAuth() {
  const session = await getAuthSession()
  if (!session?.user) {
    throw new Error('Unauthenticated')
  }
  return session
}

// 특정 권한 확인
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    USER: 1,
    MANAGER: 2,
    ADMIN: 3,
  }
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0)
}

// RBAC 권한 설정
export const MENU_PERMISSIONS = {
  DASHBOARD: ['ADMIN', 'MANAGER', 'USER'],
  MARKET: ['ADMIN', 'MANAGER'],
  ECLINICAL: ['ADMIN', 'MANAGER'],
  SENDING: ['ADMIN'],
  SETTINGS: ['ADMIN'],
}
