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
        email: { label: 'ì´ë©ì¼', type: 'email', placeholder: 'user@green-ribbon.co.kr' },
        password: { label: 'ë¹ë°ë²í¸', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('ì´ë©ì¼ê³¼ ë¹ë°ë²í¸ë¥¼ ìë ¥í´ì£¼ì¸ì.')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('ë±ë¡ëì§ ìì ì´ë©ì¼ìëë¤.')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          throw new Error('ë¹ë°ë²í¸ê° ì¬ë°ë¥´ì§ ììµëë¤.')
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
    maxAge: 24 * 60 * 60, // 24ìê°
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

// ìë² ì¸ì ì¡°í
export const getAuthSession = () => getServerSession(authOptions)

// ê¶í ê²ì¦
export async function requireAuth() {
  const session = await getAuthSession()
  if (!session?.user) {
    throw new Error('Unauthenticated')
  }
  return session
}

// í¹ì  ê¶í íì¸
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    USER: 1,
    MANAGER: 2,
    ADMIN: 3,
  }
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0)
}

// RBAC ê¶í ì¤ì 
export const MENU_PERMISSIONS = {
  DASHBOARD: ['ADMIN', 'MANAGER', 'USER'],
  MARKET: ['ADMIN', 'MANAGER'],
  ECLINICAL: ['ADMIN', 'MANAGER'],
  SENDING: ['ADMIN'],
  SETTINGS: ['ADMIN'],
}
