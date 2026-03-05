import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import CharacterSelectPage from './pages/CharacterSelectPage'
import CharacterOverviewPage from './pages/CharacterOverviewPage'
import SpellListPage from './pages/SpellListPage'
import PrepareSpellsPage from './pages/PrepareSpellsPage'
import SearchSpellsPage from './pages/SearchSpellsPage'
import SpellsPerDayPage from './pages/SpellsPerDayPage'
import SpellLogPage from './pages/SpellLogPage'
import StatsPage from './pages/StatsPage'
import ThemePage from './pages/ThemePage'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/characters" replace />} />
          <Route path="/characters" element={<ProtectedRoute><CharacterSelectPage /></ProtectedRoute>} />
          <Route path="/characters/:id" element={<ProtectedRoute><CharacterOverviewPage /></ProtectedRoute>} />
          <Route path="/characters/:id/spells" element={<ProtectedRoute><SpellListPage /></ProtectedRoute>} />
          <Route path="/characters/:id/prepare" element={<ProtectedRoute><PrepareSpellsPage /></ProtectedRoute>} />
          <Route path="/characters/:id/search-spells" element={<ProtectedRoute><SearchSpellsPage /></ProtectedRoute>} />
          <Route path="/characters/:id/spells-per-day" element={<ProtectedRoute><SpellsPerDayPage /></ProtectedRoute>} />
          <Route path="/characters/:id/spell-log" element={<ProtectedRoute><SpellLogPage /></ProtectedRoute>} />
          <Route path="/characters/:id/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          <Route path="/characters/:id/theme" element={<ProtectedRoute><ThemePage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
