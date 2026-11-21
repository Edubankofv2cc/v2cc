import { Languages, LayoutDashboard, LogOut, Menu, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { TAGLINE_TA } from '@/i18n/dictionary'
import { useI18n } from '@/i18n/LanguageProvider'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { Button } from './ui/button'
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from './ui/dialog'

function LangButton({ className }: { className?: string }) {
  const { t, toggle } = useI18n()
  return (
    <Button variant="outline" size="sm" onClick={toggle} aria-label={t.nav.languageLabel} className={className}>
      <Languages aria-hidden />
      {t.nav.language}
    </Button>
  )
}

const YEAR = new Date().getFullYear()

export function Layout() {
  const { t } = useI18n()
  const { user, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const links = [
    { to: '/', label: t.nav.home, end: true },
    { to: '/about', label: t.nav.about },
    ...(user ? [{ to: '/dashboard', label: t.nav.dashboard }] : []),
    ...(isAdmin ? [{ to: '/admin', label: t.nav.admin }] : []),
  ]
  const navCls = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted', isActive ? 'text-primary' : 'text-foreground/80')

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:p-2">
        Skip to content
      </a>
      {!isSupabaseConfigured && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">{t.common.configMissing}</div>
      )}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-base font-semibold text-primary">{t.brand.name}</div>
              <div className="hidden truncate text-[11px] text-muted-foreground sm:block">{TAGLINE_TA}</div>
            </div>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navCls}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <LangButton className="hidden sm:inline-flex" />
            {user ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:inline-flex">
                <LogOut aria-hidden />
                {t.nav.signOut}
              </Button>
            ) : (
              <Button asChild size="sm" className="hidden md:inline-flex">
                <Link to="/auth">{t.nav.signIn}</Link>
              </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label={t.nav.menu}>
                  <Menu />
                </Button>
              </DialogTrigger>
              <SheetContent closeLabel={t.common.close} aria-describedby={undefined}>
                <DialogTitle className="mb-4 flex items-center gap-2 text-base">
                  <Logo className="size-9" /> {t.brand.name}
                </DialogTitle>
                <nav className="flex flex-col gap-1" aria-label="Mobile">
                  {links.map((l) => (
                    <NavLink key={l.to} to={l.to} end={l.end} className={navCls} onClick={() => setOpen(false)}>
                      {l.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-auto flex flex-col gap-2">
                  <LangButton />
                  {user ? (
                    <Button variant="outline" onClick={() => { setOpen(false); void signOut() }}>
                      <LogOut aria-hidden />
                      {t.nav.signOut}
                    </Button>
                  ) : (
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link to="/auth">{t.nav.signIn}</Link>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1" key={pathname}>
        <Outlet />
      </main>

      <footer className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Logo className="ring-2 ring-white/30" />
            <div>
              <p className="font-display text-lg font-semibold">{t.brand.club}</p>
              <p className="font-tamil text-sm text-white/85">{TAGLINE_TA}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm text-white/80 sm:items-end">
            <div className="flex gap-4">
              <Link to="/about" className="hover:text-white">{t.nav.about}</Link>
              {user && <Link to="/dashboard" className="inline-flex items-center gap-1 hover:text-white"><LayoutDashboard className="size-4" aria-hidden />{t.nav.dashboard}</Link>}
              {isAdmin && <Link to="/admin" className="inline-flex items-center gap-1 hover:text-white"><ShieldCheck className="size-4" aria-hidden />{t.nav.admin}</Link>}
            </div>
            <p className="text-xs">{t.footer.privacy}</p>
            <p className="text-xs">© {YEAR} {t.footer.rights}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
