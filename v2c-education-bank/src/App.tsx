import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { Spinner } from './components/ui/states'
import { useI18n } from './i18n/LanguageProvider'
import Home from './pages/Home'

const About = lazy(() => import('./pages/About'))
const AuthPage = lazy(() => import('./pages/Auth'))
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const Admin = lazy(() => import('./pages/admin/Admin'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  const { t } = useI18n()
  return (
    <>
      <Suspense fallback={<Spinner label={t.common.loading} className="py-24" />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="admin" element={<RequireAuth><Admin /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster richColors position="top-center" closeButton />
    </>
  )
}
