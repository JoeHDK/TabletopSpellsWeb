import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { charactersApi } from '../api/characters'
import { itemsApi } from '../api/items'
import { customItemsApi } from '../api/customItems'
import { useAuthStore } from '../store/authStore'
import { lookupArmor } from '../utils/armorTable'
import CustomItemFormModal from '../components/CustomItemFormModal'
import type { AddMemberRequest, GiveItemRequest, ItemSource, ArmorType, SaveCustomItemRequest } from '../types'


type GiveFormState = {
  name: string
  itemSource: ItemSource
  srdItemIndex: string
  customItemId: string
  quantity: number
  acBonusStr: string
  armorType: ArmorType | undefined
}

const defaultGiveForm = (): GiveFormState => ({
  name: '',
  itemSource: 'SRD' as ItemSource,
  srdItemIndex: '',
  customItemId: '',
  quantity: 1,
  acBonusStr: '',
  armorType: undefined,
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
  const [itemSearch, setItemSearch] = useState('')
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null)

  // Add Custom Item state
  const [showAddCustom, setShowAddCustom] = useState(false)

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.get(id!),
    enabled: !!id,
  })

  const { data: myCharacters = [] } = useQuery({
    queryKey: ['characters'],
    queryFn: charactersApi.getAll,
  })

  const { data: srdItems = [] } = useQuery({
    queryKey: ['srd-items-all'],
    queryFn: () => itemsApi.getAll(),
    enabled: showGiveItem,
    staleTime: 5 * 60 * 1000,
  })

  const { data: customItems = [] } = useQuery({
    queryKey: ['custom-items'],
    queryFn: () => customItemsApi.getAll(),
    enabled: showGiveItem,
  })

  const combinedItems = useMemo(() => {
    const srd = srdItems.map(i => ({ key: `srd:${i.index}`, name: i.name, damage: i.damage, source: 'SRD' as ItemSource, srdIndex: i.index, customId: undefined as string | undefined }))
    const custom = customItems.map(i => ({ key: `custom:${i.id}`, name: i.name, damage: i.damage, source: 'Custom' as ItemSource, srdIndex: undefined as string | undefined, customId: i.id }))
    return [...srd, ...custom]
  }, [srdItems, customItems])

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return combinedItems.slice(0, 50)
    const q = itemSearch.toLowerCase()
    return combinedItems.filter(i => i.name.toLowerCase().includes(q)).slice(0, 50)
  }, [combinedItems, itemSearch])

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
      setGiveForm(defaultGiveForm())
      setItemSearch('')
      setSelectedItemKey(null)
      setGiveError('')
    },
    onError: () => setGiveError('Failed to give item. Check the recipient character.'),
  })

  const addCustomItemMutation = useMutation({
    mutationFn: (req: SaveCustomItemRequest) => customItemsApi.create(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-items'] })
      setShowAddCustom(false)
    },
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
                  onClick={() => { setShowGiveItem(v => !v); setGiveForm(defaultGiveForm()); setItemSearch(''); setSelectedItemKey(null); setGiveError('') }}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  {showGiveItem ? 'Cancel' : '+ Give Item'}
                </button>
              </div>

              {showGiveItem && (
                <div className="bg-gray-900 rounded-xl p-4 space-y-4">
                  {/* Recipient */}
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

                  {/* Item search */}
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Item</label>
                    {selectedItemKey ? (
                      <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-indigo-600">
                        <span className="flex-1 text-sm text-white">{giveForm.name}</span>
                        <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-700 rounded">{giveForm.itemSource}</span>
                        <button onClick={() => { setSelectedItemKey(null); setGiveForm(f => ({ ...f, name: '', srdItemIndex: '', customItemId: '', acBonusStr: '', armorType: undefined })); setItemSearch('') }} className="text-gray-400 hover:text-white text-xs">✕</button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          value={itemSearch}
                          onChange={e => setItemSearch(e.target.value)}
                          placeholder="Search SRD or custom items…"
                          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                        />
                        {itemSearch.trim() && (
                          <div className="bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                            {filteredItems.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-gray-400">No items found</div>
                            ) : filteredItems.map(item => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                  const armor = lookupArmor(item.name)
                                  setSelectedItemKey(item.key)
                                  setGiveForm(f => ({
                                    ...f,
                                    name: item.name,
                                    itemSource: item.source,
                                    srdItemIndex: item.srdIndex ?? '',
                                    customItemId: item.customId ?? '',
                                    acBonusStr: armor ? String(armor.ac) : f.acBonusStr,
                                    armorType: armor?.type ?? f.armorType,
                                  }))
                                  setItemSearch('')
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-0"
                              >
                                <span className="text-sm text-white">{item.name}</span>
                                <span className="ml-2 text-xs text-gray-400">{item.source}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {!itemSearch.trim() && (
                          <div>
                            <label className="text-xs text-gray-400 block mb-1 mt-1">Or enter name manually</label>
                            <input
                              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                              value={giveForm.name}
                              onChange={e => {
                                const name = e.target.value
                                const armor = lookupArmor(name)
                                setGiveForm(f => ({
                                  ...f,
                                  name,
                                  acBonusStr: f.acBonusStr || (armor ? String(armor.ac) : ''),
                                  armorType: f.armorType ?? armor?.type,
                                }))
                              }}
                              placeholder="Item name…"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                    <input
                      type="number" min={1}
                      className="w-32 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none text-sm"
                      value={giveForm.quantity}
                      onChange={e => setGiveForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                    />
                  </div>

                  {giveError && <p className="text-red-400 text-sm">{giveError}</p>}
                  <button
                    disabled={giveItemMutation.isPending || !giveForm.name || !giveRecipientId}
                    onClick={() => giveItemMutation.mutate({
                      recipientCharacterId: giveRecipientId,
                      itemSource: giveForm.itemSource,
                      srdItemIndex: giveForm.srdItemIndex || undefined,
                      customItemId: giveForm.customItemId || undefined,
                      name: giveForm.name,
                      quantity: giveForm.quantity,
                      acBonus: giveForm.acBonusStr ? Number(giveForm.acBonusStr) : undefined,
                      armorType: giveForm.armorType,
                    })}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm"
                  >
                    {giveItemMutation.isPending ? 'Giving…' : 'Give Item'}
                  </button>
                </div>
              )}
            </section>

            {/* Add Custom Item */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Custom Items</h2>
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  + Add Custom Item
                </button>
              </div>
            </section>

            {showAddCustom && (
              <CustomItemFormModal
                onSave={data => addCustomItemMutation.mutate(data)}
                onClose={() => setShowAddCustom(false)}
                isSaving={addCustomItemMutation.isPending}
              />
            )}
          </>
        )}

        {/* All Members — Campaign Log & Handouts */}
        <section>
          <Link
            to={`/games/${id}/log`}
            className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-3 transition-colors"
          >
            <span className="text-2xl">📖</span>
            <div>
              <p className="font-medium">Campaign Log</p>
              <p className="text-xs text-gray-400">Searchable notes and session records</p>
            </div>
            <span className="ml-auto text-gray-500">→</span>
          </Link>
        </section>

        <section>
          <Link
            to={`/games/${id}/images`}
            className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-3 transition-colors"
          >
            <span className="text-2xl">🖼️</span>
            <div>
              <p className="font-medium">{isDM ? 'Image Library' : 'Handouts'}</p>
              <p className="text-xs text-gray-400">{isDM ? 'Handouts, maps, and campaign images' : 'Images shared by your DM'}</p>
            </div>
            <span className="ml-auto text-gray-500">→</span>
          </Link>
        </section>
      </div>
    </div>
  )
}
