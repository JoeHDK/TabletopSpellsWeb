import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spellLogsApi } from '../api/spells'

export default function SpellLogPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['spellLogs', id],
    queryFn: () => spellLogsApi.getAll(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: (logId: string) => spellLogsApi.delete(id!, logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spellLogs', id] }),
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/characters/${id}`)} aria-label="Go back" className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold">Spell Log</h1>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No spells cast yet</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-gray-900 rounded-xl px-4 py-3 flex items-start justify-between">
              <div>
                <p className="font-medium">{log.spellName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Level {log.spellLevel} •{' '}
                  {log.castAsRitual ? 'Ritual • ' : ''}
                  <span className={log.success ? 'text-green-400' : 'text-red-400'}>
                    {log.success ? 'Success' : 'Failed'}
                  </span>
                </p>
                {log.reason && <p className="text-xs text-gray-500 mt-0.5">{log.reason}</p>}
                <p className="text-xs text-gray-600 mt-0.5">{new Date(log.castTime).toLocaleString()}</p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(log.id)}
                aria-label={`Delete log entry for ${log.spellName}`}
                className="text-gray-600 hover:text-red-400 text-sm ml-2 mt-0.5"
              >✕</button>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
