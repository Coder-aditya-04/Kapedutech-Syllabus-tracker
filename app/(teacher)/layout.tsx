import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Unacademy Nashik — Weekly Log',
  description: 'Submit your weekly lecture log',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
