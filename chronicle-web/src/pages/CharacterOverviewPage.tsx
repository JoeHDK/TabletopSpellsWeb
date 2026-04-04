import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { charactersApi } from '../api/characters'
import { racesApi } from '../api/races'
import { isPreparingCaster } from '../utils/spellUtils'
import { useUserPreferences } from '../hooks/useUserPreferences'

interface NavItem {
  label: string
  path: string   // short key used for dnd id and saved order
  to: string     // full route path for navigation
}

function SortableCard({ item, editMode, colSpan2 }: { item: NavItem; editMode: boolean; colSpan2: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.path })
  const style = { transform: CSS.Transform.toString(transform), transition }

  if (!editMode) {
    return (
      <Link
        to={item.to}
        className={`bg-gray-900 hover:bg-gray-800 rounded-xl p-6 text-center transition-colors ${colSpan2 ? 'col-span-2' : ''}`}
      >
        <span className="text-2xl block mb-2">{item.label.split(' ')[0]}</span>
        <span className="text-sm font-medium">{item.label.split(' ').slice(1).join(' ')}</span>
      </Link>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-4 col-span-2 ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none px-1 flex-shrink-0"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <span className="text-xl flex-shrink-0">{item.label.split(' ')[0]}</span>
      <span className="text-sm font-medium">{item.label.split(' ').slice(1).join(' ')}</span>
    </div>
  )
}

export default function CharacterOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editMode, setEditMode] = useState(false)
  const { preferences, updatePreferences } = useUserPreferences()

  const { data: character, isLoading } = useQuery({
    queryKey: ['character', id],
    queryFn: () => charactersApi.get(id!),
    enabled: !!id,
  })

  const { data: race } = useQuery({
    queryKey: ['race', character?.race],
    queryFn: () => racesApi.getOne(character!.race!),
    enabled: !!character?.race,
  })

  const canonicalItems: NavItem[] = useMemo(() => {
    if (!character) return []
    const make = (label: string, path: string) => ({ label, path, to: `/characters/${id}/${path}` })
    return character.isDivineCaster
      ? [
          make('📖 Spell List', 'spells'),
          make('🔮 Spells per day', 'spells-per-day'),
          make('📜 Log', 'spell-log'),
          make('📊 Stats', 'stats'),
          make('✨ Features', 'features'),
          make('🎒 Inventory', 'inventory'),
          make('🎯 Feats', 'feats'),
        ]
      : [
          make('📖 Spell List', 'spells'),
          make('🔍 Search Spells', 'search-spells'),
          ...(isPreparingCaster(character.characterClass) ? [make('✨ Prepare Spells', 'prepare')] : []),
          make('🔮 Spells per day', 'spells-per-day'),
          make('📜 Log', 'spell-log'),
          make('📊 Stats', 'stats'),
          make('✨ Features', 'features'),
          make('🎒 Inventory', 'inventory'),
          make('🎯 Feats', 'feats'),
        ]
  }, [character, id])

  // Apply saved order: sort canonical items by saved order, append unknown items at end
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)

  const savedOrder = preferences?.overviewCardOrder ?? []

  const navItems: NavItem[] = useMemo(() => {
    const order = localOrder ?? savedOrder
    if (order.length === 0) return canonicalItems
    const byPath = Object.fromEntries(canonicalItems.map((item) => [item.path, item]))
    const sorted = order.filter((p) => byPath[p]).map((p) => byPath[p])
    const extra = canonicalItems.filter((item) => !order.includes(item.path))
    return [...sorted, ...extra]
  }, [canonicalItems, localOrder, savedOrder])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = navItems.findIndex((i) => i.path === active.id)
    const newIndex = navItems.findIndex((i) => i.path === over.id)
    const reordered = arrayMove(navItems, oldIndex, newIndex)
    const newPaths = reordered.map((i) => i.path)
    setLocalOrder(newPaths)
    updatePreferences({ overviewCardOrder: newPaths })
  }

  function handleDoneEdit() {
    setEditMode(false)
    setLocalOrder(null)
  }

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  if (!character) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Not found</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/characters')} aria-label="Go back" className="text-gray-400 hover:text-white">← Back</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{character.name}</h1>
          <p className="text-sm text-gray-400">
            {race ? `${race.name} ` : ''}{character.characterClass} • Level {character.level}
          </p>
        </div>
        {editMode ? (
          <button
            onClick={handleDoneEdit}
            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 px-3 py-1 rounded-lg border border-indigo-700 hover:border-indigo-500 transition-colors"
          >
            Done
          </button>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="text-gray-500 hover:text-gray-300 text-lg transition-colors"
            aria-label="Edit card order"
          >
            ✎
          </button>
        )}
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {editMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={navItems.map((i) => i.path)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-2 gap-3">
                {navItems.map((item, idx) => (
                  <SortableCard
                    key={item.path}
                    item={item}
                    editMode={true}
                    colSpan2={navItems.length % 2 !== 0 && idx === navItems.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {navItems.map((item, idx) => (
              <SortableCard
                key={item.path}
                item={item}
                editMode={false}
                colSpan2={navItems.length % 2 !== 0 && idx === navItems.length - 1}
              />
            ))}
          </div>
        )}
        <Link
          to="/items"
          className="mt-4 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 rounded-xl p-4 text-center transition-colors w-full"
        >
          <span className="text-2xl">🗡️</span>
          <span className="text-sm font-medium">Search Items</span>
        </Link>
      </main>
    </div>
  )
}
