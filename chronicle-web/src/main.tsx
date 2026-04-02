import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createIDBPersister } from './lib/queryPersister'
import OfflineBanner from './components/OfflineBanner'
import InstallPromptBanner from './components/InstallPromptBanner'
import SplashScreen from './components/SplashScreen'
import './index.css'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import CharacterSelectPage from './pages/CharacterSelectPage'
import CharacterSheetPage from './pages/CharacterSheetPage'
import SpellListPage from './pages/SpellListPage'
import PrepareSpellsPage from './pages/PrepareSpellsPage'
import SearchSpellsPage from './pages/SearchSpellsPage'
import SpellsPerDayPage from './pages/SpellsPerDayPage'
import SpellLogPage from './pages/SpellLogPage'
import StatsPage from './pages/StatsPage'
import SearchItemsPage from './pages/SearchItemsPage'
import GamePage from './pages/GamePage'
import PartyOverviewPage from './pages/PartyOverviewPage'
import InventoryPage from './pages/InventoryPage'
import ConversationListPage from './pages/ConversationListPage'
import ConversationPage from './pages/ConversationPage'
import FriendsPage from './pages/FriendsPage'
import CreatureLibraryPage from './pages/CreatureLibraryPage'
import CombatTrackerPage from './pages/CombatTrackerPage'
import SessionPlannerPage from './pages/SessionPlannerPage'
import FeatsPage from './pages/FeatsPage'
import FeaturesPage from './pages/FeaturesPage'
import SettingsPage from './pages/SettingsPage'

const persister = createIDBPersister()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <BrowserRouter>
        <SplashScreen />
        <OfflineBanner />
        <InstallPromptBanner />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/characters" replace />} />
          <Route path="/characters" element={<ProtectedRoute><CharacterSelectPage /></ProtectedRoute>} />
          <Route path="/characters/:id" element={<ProtectedRoute><CharacterSheetPage /></ProtectedRoute>} />
          <Route path="/characters/:id/spells" element={<ProtectedRoute><SpellListPage /></ProtectedRoute>} />
          <Route path="/characters/:id/prepare" element={<ProtectedRoute><PrepareSpellsPage /></ProtectedRoute>} />
          <Route path="/characters/:id/search-spells" element={<ProtectedRoute><SearchSpellsPage /></ProtectedRoute>} />
          <Route path="/characters/:id/spells-per-day" element={<ProtectedRoute><SpellsPerDayPage /></ProtectedRoute>} />
          <Route path="/characters/:id/spell-log" element={<ProtectedRoute><SpellLogPage /></ProtectedRoute>} />
          <Route path="/characters/:id/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          <Route path="/characters/:id/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
          <Route path="/characters/:id/feats" element={<ProtectedRoute><FeatsPage /></ProtectedRoute>} />
          <Route path="/characters/:id/features" element={<ProtectedRoute><FeaturesPage /></ProtectedRoute>} />
          <Route path="/items" element={<ProtectedRoute><SearchItemsPage /></ProtectedRoute>} />
          <Route path="/games/:id" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
          <Route path="/games/:id/party" element={<ProtectedRoute><PartyOverviewPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ConversationListPage /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
          <Route path="/creatures" element={<ProtectedRoute><CreatureLibraryPage /></ProtectedRoute>} />
          <Route path="/games/:id/combat" element={<ProtectedRoute><CombatTrackerPage /></ProtectedRoute>} />
          <Route path="/games/:id/planner" element={<ProtectedRoute><SessionPlannerPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
