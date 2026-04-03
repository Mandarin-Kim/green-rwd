import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Green-RWD | Clinical Platform v2',
  description: 'RWD 기반 타겟 마케팅 & 임상시험 통합 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
