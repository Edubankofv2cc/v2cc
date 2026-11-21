import { BookX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/LanguageProvider'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <BookX className="size-12 text-primary" aria-hidden />
      <h1 className="mt-4 text-3xl font-bold">{t.notFound.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.notFound.body}</p>
      <Button asChild className="mt-6"><Link to="/">{t.notFound.home}</Link></Button>
    </div>
  )
}
