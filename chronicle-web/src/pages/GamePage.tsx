import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { charactersApi } from '../api/characters'
import { useAuthStore } from '../store/authStore'
import type { AddMemberRequest, GiveItemRequest, CreateLootItemRequest, LootItem, ItemSource } from '../types'

const defaultGiveForm = (): Omit<GiveItemRequest, 'recipientCharacterId'> & { acBonusStr: string } => ({
  name: '',
  itemSource: 'SRD' as ItemSource,
  srdItemIndex: '',
  quantity: 1,
  acBonusStr: '',
  damageOverride: '',
  notes: '',
})

const defaultLootForm = (): CreateLootItemRequest & { acBonusStr: string } => ({
  name: '',
  itemSource: 'SRD' as ItemSource,
  quantity: 1,
  acBonusStr: '',
  damageOverride: '',
  notes: '',
})

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { userId } = useAuthStore()

  const [copied, setCopied] = useState(false)
  const [addUsername, setAddUsername] = useState('')
  const [addError, setAddError] = useState('')
  const [showLinkChar, setShowLinkChar] = useState(false)
  const [showGiveItem, setShowGiveItem] = useState(false)
  const [giveForm, setGiveForm] = useState(defaultGiveForm())
  const [giveRecipientId, setGiveRecipientId] = useState('')
  const [giveError, setGiveError] = useState('')

  // Loot stash state
  const [showLootStash, setShowLootStash] = useState(false)
  const [showLootForm, setShowLootForm] = useState(false)
  const [lootForm, setLootForm] = useState(defaultLootForm())
  const [givingLootId, setGivingLootId] = useState<string | null>(null)
  const [lootRecipientId, setLootRecipientId] = useState('')
  const [lootGiveError, setLootGiveError] = useState('')

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.get(id!),
    enabled: !!id,
  })

  const { data: myCharacters = [] } = useQuery({
    queryKey: ['characters'],
    queryFn: charactersApi.getAll,
  })

  const { data: lootItems = [] } = useQuery({
    queryKey: ['game-loot', id],
    queryFn: () => gamesApi.getLoot(id!),
    enabled: !!id && showLootStash,
  })

  const addMemberMutation = useMutation({
    mutationFn: (data: AddMemberRequest) => gamesApi.addMember(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game', id] })
      setAddUsername('')
      setAddError('')
    },
    onError: () => setAddError('User not found or already a member.'),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (uid: string) => gamesApi.removeMember(id!, uid),
    onSuccess: (_, uid) => {
      if (uid === userId) {
        qc.invalidateQueries({ queryKey: ['games'] })
        navigate('/characters')
      } else {
        qc.invalidateQueries({ queryKey: ['game', id] })
      }
    },
  })

  const linkCharMutation = useMutation({
    mutationFn: (characterId: string) => gamesApi.linkCharacter(id!, { characterId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game', id] })
      qc.invalidateQueries({ queryKey: ['characters'] })
      setShowLinkChar(false)
    },
  })

  const unlinkCharMutation = useMutation({
    mutationFn: (characterId: string) => gamesApi.unlinkCharacter(id!, characterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['game', id] })
      qc.invalidateQueries({ queryKey: ['characters'] })
    },
  })

  const giveItemMutation = useMutation({
    mutationFn: (req: GiveItemRequest) => gamesApi.giveItem(id!, req),
    onSuccess: () => {
      setShowGiveItem(false)
      setGiveForm(defaultGiveForm())
      setGiveRecipientId('')
      setGiveError('')
    },
    onError: () => setGiveError('Failed to give item. Check the recipient character.'),
  })

  const createLootMutation = useMutation({
    mutationFn: (req: CreateLootItemRequest) => gamesApi.createLootItem(id!, req),
    onSuccess: (newItem) => {
      qc.setQueryData<LootItem[]>(['game-loot', id], old => [...(old ?? []), newItem])
      setLootForm(defaultLootForm())
      setShowLootForm(false)
    },
  })

  const deleteLootMutation = useMutation({
    mutationFn: (itemId: string) => gamesApi.deleteLootItem(id!, itemId),
    onSuccess: (_, itemId) => {
      qc.setQueryData<LootItem[]>(['game-loot', id], old => old?.filter(i => i.id !== itemId) ?? [])
    },
  })

  const giveLootMutation = useMutation({
    mutationFn: ({ item, recipientCharacterId }: { item: LootItem; recipientCharacterId: string }) =>
      gamesApi.giveItem(id!, {
        recipientCharacterId,
        itemSource: item.itemSource,
        srdItemIndex: item.srdItemIndex,
        customItemId: item.customItemId,
        name: item.name,
        quantity: item.quantity,
        acBonus: item.acBonus,
        damageOverride: item.damageOverride,
        notes: item.notes,
      }),
    onSuccess: () => {
      setGivingLootId(null)
      setLootRecipientId('')
      setLootGiveError('')
    },
    onError: () => setLootGiveError('Failed to give item.'),
  })

  const copyInviteCode = () => {
    if (!game) return
    navigator.clipboard.writeText(game.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyInviteLink = () => {
    if (!game) return
    navigator.clipboard.writeText(`${window.location.origin}/join/${game.inviteCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  if (!game) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Game not found</div>

  const isDM = game.myRole === 'DM'
  const linkedCharacterIds = new Set(game.characters.map((c) => c.characterId))
  const availableToLink = myCharacters.filter((c) => !linkedCharacterIds.has(c.id))

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/characters')} className="text-gray-400 hover:text-white">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{game.name}</h1>
          <p className="text-xs text-gray-400">DM: {game.dmUsername}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${isDM ? 'bg-amber-900/50 text-amber-300' : 'bg-indigo-900/50 text-indigo-300'}`}>
          {game.myRole}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 max-w-2xl mx-auto w-full">

        {/* Invite Code */}
        {isDM && (
          <section className="bg-gray-900 rounded-xl p-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Invite</h2>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-widest text-indigo-300">{game.inviteCode}</span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={copyInviteCode}
                  className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy Code'}
                </button>
                <button
                  onClick={copyInviteLink}
                  className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Members */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Members</h2>
          </div>

          {isDM && (
            <form
              onSubmit={(e) => { e.preventDefault(); addMemberMutation.mutate({ username: addUsername }) }}
              className="flex gap-2"
            >
              <input
                value={addUsername}
                onChange={(e) => { setAddUsername(e.target.value); setAddError('') }}
                placeholder="Add player by username…"
                className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
              />
              <button
                type="submit"
                disabled={addMemberMutation.isPending || !addUsername}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm"
              >
                Add
              </button>
            </form>
          )}
          {addError && <p className="text-red-400 text-sm">{addError}</p>}

          <div className="space-y-2">
            {game.members.map((m) => (
              <div key={m.userId} className="bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <span className="font-medium">{m.username}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${m.role === 'DM' ? 'bg-amber-900/50 text-amber-300' : 'bg-gray-800 text-gray-400'}`}>
                    {m.role}
                  </span>
                </div>
                {(isDM && m.userId !== userId && m.role !== 'DM') || m.userId === userId ? (
                  <button
                    onClick={() => {
                      const msg = m.userId === userId
                        ? isDM ? `Leave "${game.name}"? This will delete the game for everyone.` : `Leave "${game.name}"?`
                        : `Remove ${m.username}?`
                      if (confirm(msg)) removeMemberMutation.mutate(m.userId)
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${m.userId === userId ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-400'}`}
                  >
                    {m.userId === userId ? 'Leave' : 'Remove'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Characters in this game */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Characters</h2>
            {availableToLink.length > 0 && (
              <button
                onClick={() => setShowLinkChar((v) => !v)}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                + Link character
              </button>
            )}
          </div>

          {showLinkChar && (
            <div className="bg-gray-800 rounded-xl p-3 space-y-2">
              <p className="text-xs text-gray-400">Choose one of your characters to link:</p>
              {availableToLink.map((c) => (
                <button
                  key={c.id}
                  onClick={() => linkCharMutation.mutate(c.id)}
                  disabled={linkCharMutation.isPending}
                  className="w-full text-left bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 text-sm transition-colors"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-400 ml-2">{c.characterClass} · Lvl {c.level}</span>
                </button>
              ))}
            </div>
          )}

          {game.characters.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">No characters linked yet.</p>
          ) : (
            <div className="space-y-2">
              {game.characters.map((c) => (
                <div key={c.characterId} className="bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <span className="font-medium">{c.characterName}</span>
                    <span className="text-xs text-gray-400 ml-2">{c.characterClass} · Lvl {c.level}</span>
                    <span className="text-xs text-gray-500 ml-2">({c.ownerUsername})</span>
                  </div>
                  {(isDM || game.members.find((m) => m.userId === userId) !== undefined) && (
                    <button
                      onClick={() => unlinkCharMutation.mutate(c.characterId)}
                      className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded transition-colors"
                      aria-label="Unlink character"
                    >
                      Unlink
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DM Actions */}
        {isDM && (
          <>
            {/* Party Overview link */}
            <section>
              <Link
                to={`/games/${id}/party`}
                className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-3 transition-colors"
              >
                <span className="text-2xl">🧙</span>
                <div>
                  <p className="font-medium">Party Overview</p>
                  <p className="text-xs text-gray-400">HP, AC, Passive Perception, Spell Slots</p>
                </div>
                <span className="ml-auto text-gray-500">→</span>
              </Link>
            </section>

            {/* Combat Tracker link */}
            <section>
              <Link
                to={`/games/${id}/combat`}
                className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-3 transition-colors"
              >
                <span className="text-2xl">⚔️</span>
                <div>
                  <p className="font-medium">Combat Tracker</p>
                  <p className="text-xs text-gray-400">Initiative, HP, real-time encounter management</p>
                </div>
                <span className="ml-auto text-gray-500">→</span>
              </Link>
            </section>

            {/* Session Planner link */}
            <section>
              <Link
                to={`/games/${id}/planner`}
                className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-3 transition-colors"
              >
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-medium">Session Planner</p>
                  <p className="text-xs text-gray-400">Story hooks, pre-built encounter drafts</p>
                </div>
                <span className="ml-auto text-gray-500">→</span>
              </Link>
            </section>

            {/* Give Item */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Give Item</h2>
                <button
                  onClick={() => setShowGiveItem(v => !v)}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  {showGiveItem ? 'Cancel' : '+ Give Item'}
                </button>
              </div>

              {showGiveItem && (
                <div className="bg-gray-900 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Recipient Character</label>
                    <select
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none text-sm"
                      value={giveRecipientId}
                      onChange={e => setGiveRecipientId(e.target.value)}
                    >
                      <option value="">Select character…</option>
                      {game.characters.map(c => (
                        <option key={c.characterId} value={c.characterId}>
                          {c.characterName} ({c.ownerUsername})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Item Name *</label>
                      <input
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        value={giveForm.name}
                        onChange={e => setGiveForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Source</label>
                      <select
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none text-sm"
                        value={giveForm.itemSource}
                        onChange={e => setGiveForm(f => ({ ...f, itemSource: e.target.value as ItemSource }))}
                      >
                        <option value="SRD">SRD Item</option>
                        <option value="Custom">Custom Item</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                      <input
                        type="number" min={1}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        value={giveForm.quantity}
                        onChange={e => setGiveForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">AC Bonus</label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        placeholder="Leave blank if none"
                        value={giveForm.acBonusStr}
                        onChange={e => setGiveForm(f => ({ ...f, acBonusStr: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Damage</label>
                      <input
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        placeholder="e.g. 1d8+3"
                        value={giveForm.damageOverride ?? ''}
                        onChange={e => setGiveForm(f => ({ ...f, damageOverride: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Notes</label>
                      <input
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        value={giveForm.notes ?? ''}
                        onChange={e => setGiveForm(f => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  {giveError && <p className="text-red-400 text-sm">{giveError}</p>}
                  <button
                    disabled={giveItemMutation.isPending || !giveForm.name || !giveRecipientId}
                    onClick={() => giveItemMutation.mutate({
                      recipientCharacterId: giveRecipientId,
                      itemSource: giveForm.itemSource,
                      srdItemIndex: giveForm.srdItemIndex,
                      name: giveForm.name,
                      quantity: giveForm.quantity,
                      acBonus: giveForm.acBonusStr ? Number(giveForm.acBonusStr) : undefined,
                      damageOverride: giveForm.damageOverride,
                      notes: giveForm.notes,
                    })}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm"
                  >
                    Give Item
                  </button>
                </div>
              )}
            </section>

            {/* Loot Stash */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">🎁 Loot Stash</h2>
                <button
                  onClick={() => { setShowLootStash(v => !v); setShowLootForm(false) }}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  {showLootStash ? 'Hide' : 'Manage'}
                </button>
              </div>
              {!showLootStash && (
                <p className="text-xs text-gray-400">Pre-create items to quickly bestow loot to players.</p>
              )}

              {showLootStash && (
                <div className="space-y-2">
                  {/* Existing stash items */}
                  {lootItems.length === 0 && !showLootForm && (
                    <p className="text-sm text-gray-400 py-2">No items in stash yet.</p>
                  )}
                  {lootItems.map(item => (
                    <div key={item.id} className="bg-gray-900 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{item.name}</span>
                          {item.quantity > 1 && (
                            <span className="text-xs text-gray-400 ml-2">×{item.quantity}</span>
                          )}
                          {item.damageOverride && (
                            <span className="text-xs text-gray-400 ml-2">{item.damageOverride}</span>
                          )}
                          {item.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => { setGivingLootId(item.id); setLootRecipientId(''); setLootGiveError('') }}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded transition-colors"
                          >
                            Give
                          </button>
                          <button
                            onClick={() => deleteLootMutation.mutate(item.id)}
                            className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {/* Inline recipient picker */}
                      {givingLootId === item.id && (
                        <div className="mt-2 flex gap-2 items-center">
                          <select
                            className="flex-1 bg-gray-800 text-white rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none text-sm"
                            value={lootRecipientId}
                            onChange={e => setLootRecipientId(e.target.value)}
                          >
                            <option value="">Select recipient…</option>
                            {game.characters.map(c => (
                              <option key={c.characterId} value={c.characterId}>
                                {c.characterName} ({c.ownerUsername})
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={giveLootMutation.isPending || !lootRecipientId}
                            onClick={() => giveLootMutation.mutate({ item, recipientCharacterId: lootRecipientId })}
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 rounded transition-colors"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => { setGivingLootId(null); setLootGiveError('') }}
                            className="text-xs text-gray-500 hover:text-white px-2 py-1.5"
                          >✕</button>
                        </div>
                      )}
                      {givingLootId === item.id && lootGiveError && (
                        <p className="text-red-400 text-xs mt-1">{lootGiveError}</p>
                      )}
                    </div>
                  ))}

                  {/* Create new stash item form */}
                  {showLootForm ? (
                    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold">New Stash Item</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs text-gray-400 block mb-1">Item Name *</label>
                          <input
                            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                            placeholder="e.g. Sword of Flames"
                            value={lootForm.name}
                            onChange={e => setLootForm(f => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                          <input
                            type="number" min={1}
                            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                            value={lootForm.quantity}
                            onChange={e => setLootForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Damage</label>
                          <input
                            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                            placeholder="e.g. 1d8+3"
                            value={lootForm.damageOverride ?? ''}
                            onChange={e => setLootForm(f => ({ ...f, damageOverride: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">AC Bonus</label>
                          <input
                            type="number"
                            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                            placeholder="None"
                            value={lootForm.acBonusStr}
                            onChange={e => setLootForm(f => ({ ...f, acBonusStr: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Notes</label>
                          <input
                            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                            value={lootForm.notes ?? ''}
                            onChange={e => setLootForm(f => ({ ...f, notes: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowLootForm(false); setLootForm(defaultLootForm()) }}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm"
                        >Cancel</button>
                        <button
                          disabled={createLootMutation.isPending || !lootForm.name}
                          onClick={() => createLootMutation.mutate({
                            name: lootForm.name,
                            itemSource: lootForm.itemSource,
                            quantity: lootForm.quantity,
                            acBonus: lootForm.acBonusStr ? Number(lootForm.acBonusStr) : undefined,
                            damageOverride: lootForm.damageOverride || undefined,
                            notes: lootForm.notes || undefined,
                          })}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2 rounded-lg text-sm font-semibold"
                        >Save to Stash</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLootForm(true)}
                      className="w-full bg-gray-800 hover:bg-gray-700 border border-dashed border-gray-600 rounded-xl py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      + Add Item to Stash
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
