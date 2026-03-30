'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
                const result = await signIn('credentials', {
                          email,
                          password,
                          redirect: false,
                })
                if (result?.error) {
                          setError(result.error)
                } else {
                          router.push('/')
                }
        } catch (err) {
                setError('An error occurred')
        } finally {
                setLoading(false)
        }
  }

  return (
        <div className="flex min-h-screen items-center justify-center">
              <div className="w-full max-w-md p-6">
                      <h1 className="text-2xl font-bold mb-6">Green-RWD Login</h1>h1>
                      <form onSubmit={handleSubmit} className="space-y-6">
                                <Input
                                              type="email"
                                              placeholder="Email"
                                              value={email}
                                              onChange={(e) => setEmail(e.target.value)}
                                            />
                                <Input
                                              type="password"
                                              placeholder="Password"
                                              value={password}
                                              onChange={(e) => setPassword(e.target.value)}
                                            />
                                <Button disabled={loading} className="w-full">
                                  {loading ? 'Signing in...' : 'Sign in'}
                                </Button>Button>
                        {error && <p className="text-red-500">{error}</p>p>}
                      </form>form>
              </div>div>
        </div>div>
        )
}
</div>
