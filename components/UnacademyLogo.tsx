import Image from 'next/image'

/* ── Nav header logo (dark background) ─────────────────── */
export function NavLogo({ role }: { role?: string }) {
  const roleLabel =
    role === 'director'      ? 'Director' :
    role === 'academic_head' ? 'Academic Head' :
                               'Teacher'
  return (
    <div className="flex items-center gap-3 shrink-0">
      <Image src="/unacademy-logo.png" alt="Unacademy" width={148} height={42} className="brightness-0 invert" priority />
      <span className="text-gray-500 text-[11px] font-bold uppercase tracking-widest border-l border-gray-700 pl-3 leading-none whitespace-nowrap">
        {roleLabel}
      </span>
    </div>
  )
}

/* ── Login page logo (dark background) ─────────────────── */
export function LoginLogo() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Image src="/unacademy-logo.png" alt="Unacademy" width={160} height={48} className="brightness-0 invert" priority />
      <span className="text-gray-500 text-[10px] uppercase tracking-widest">Nashik</span>
    </div>
  )
}

/* ── Small icon-only variant ────────────────────────────── */
export function UnacademyIcon({ size = 32 }: { size?: number }) {
  return (
    <Image src="/unacademy-logo.png" alt="Unacademy" width={size * 3} height={size} className="brightness-0 invert object-contain" />
  )
}
