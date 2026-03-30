import { withAuth } from 'next-auth'
import { authConfig } from '@/lib/auth'

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/+'
  ]
  }

export const middleware = withAuth((args) => {
  const { request } = args
  if (!request.auth?.user) {
    return Response.redirect(new URL('/login', request.url))
  }
}, authConfig)
