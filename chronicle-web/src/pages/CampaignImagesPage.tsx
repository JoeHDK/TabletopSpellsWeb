import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { campaignImagesApi } from '../api/campaignImages'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import type { CampaignImage, GameMember } from '../types'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function useAuthImageUrl(apiPath: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!apiPath) return
    let cancelled = false
    let url: string | null = null
    api.get<Blob>(apiPath, { responseType: 'blob' }).then(r => {
      if (cancelled) return
      url = URL.createObjectURL(r.data)
      setBlobUrl(url)
    }).catch(() => {})
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [apiPath])
  return blobUrl
}

function AuthImage({ apiPath, alt, className }: { apiPath: string; alt: string; className?: string }) {
  const src = useAuthImageUrl(apiPath)
  if (!src) return <div className={`bg-gray-700 animate-pulse ${className ?? ''}`} />
  return <img src={src} alt={alt} className={className} draggable={false} />
}

function ImageZoomModal({ apiPath, alt, onClose }: { apiPath: string; alt: string; onClose: () => void }) {
  const src = useAuthImageUrl(apiPath)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.max(0.5, Math.min(5, s - e.deltaY * 0.001)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return
    setPosition({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    })
  }

  const handleMouseUp = () => { setDragging(false); dragStart.current = null }

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center overflow-hidden"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white text-2xl z-10 bg-gray-800/80 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition-colors"
        onClick={onClose}
      >✕</button>
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button
          onClick={e => { e.stopPropagation(); setScale(s => Math.min(5, s + 0.25)) }}
          className="bg-gray-800/80 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-gray-700 transition-colors"
        >＋</button>
        <button
          onClick={e => { e.stopPropagation(); setScale(1); setPosition({ x: 0, y: 0 }) }}
          className="bg-gray-800/80 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-gray-700 transition-colors"
        >Reset</button>
        <button
          onClick={e => { e.stopPropagation(); setScale(s => Math.max(0.5, s - 0.25)) }}
          className="bg-gray-800/80 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-gray-700 transition-colors"
        >－</button>
      </div>
      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={e => e.stopPropagation()}
        className={`${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: dragging ? 'none' : 'transform 0.1s' }}
      >
        <img src={src ?? undefined} alt={alt} className="max-w-[90vw] max-h-[90vh] object-contain select-none" draggable={false} />
      </div>
    </div>
  )
}

export default function CampaignImagesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { userId } = useAuthStore()

  const [zoomImage, setZoomImage] = useState<CampaignImage | null>(null)
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [publishModal, setPublishModal] = useState<CampaignImage | null>(null)
  const [publishToAll, setPublishToAll] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [editCaption, setEditCaption] = useState<{ id: string; value: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: game } = useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.get(id!),
    enabled: !!id,
  })

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['campaign-images', id],
    queryFn: () => campaignImagesApi.getAll(id!),
    enabled: !!id,
  })

  const isDm = game?.myRole === 'DM'

  const uploadMutation = useMutation({
    mutationFn: ({ file, caption }: { file: File; caption: string }) =>
      campaignImagesApi.upload(id!, file, caption || undefined),
    onSuccess: (image) => {
      qc.setQueryData<CampaignImage[]>(['campaign-images', id], (old = []) => [image, ...old])
      setUploadCaption('')
      setUploadError('')
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: () => setUploadError('Upload failed. Max size is 10 MB. Accepted: JPEG, PNG, GIF, WebP.'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { imageId: string; patch: Parameters<typeof campaignImagesApi.update>[2] }) =>
      campaignImagesApi.update(id!, data.imageId, data.patch),
    onSuccess: (updated) => {
      qc.setQueryData<CampaignImage[]>(['campaign-images', id], (old = []) =>
        old.map(img => img.id === updated.id ? updated : img)
      )
      setPublishModal(null)
      setEditCaption(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => campaignImagesApi.delete(id!, imageId),
    onSuccess: (_, imageId) => {
      qc.setQueryData<CampaignImage[]>(['campaign-images', id], (old = []) =>
        old.filter(img => img.id !== imageId)
      )
    },
  })

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    uploadMutation.mutate({ file, caption: uploadCaption })
  }

  const openPublish = (image: CampaignImage) => {
    setPublishModal(image)
    setPublishToAll(image.publishedToUserIds === null)
    setSelectedUserIds(image.publishedToUserIds ?? [])
  }

  const submitPublish = (image: CampaignImage) => {
    updateMutation.mutate({
      imageId: image.id,
      patch: {
        isPublished: true,
        publishedToUserIds: publishToAll ? [] : selectedUserIds,
      },
    })
  }

  const imageApiPath = (image: CampaignImage) =>
    `/game-rooms/${id}/images/${image.id}/file`

  const players: GameMember[] = (game?.members ?? []).filter(m => m.role !== 'DM' && m.userId !== userId)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/games/${id}`)}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >←</button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate">{isDm ? 'Image Library' : 'Handouts'}</h1>
          {game && <p className="text-xs text-gray-500 truncate">{game.name}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-4xl mx-auto w-full space-y-4">
        {/* DM upload section */}
        {isDm && (
          <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Upload Image</h2>
            <input
              type="text"
              value={uploadCaption}
              onChange={e => setUploadCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
              >
                {uploadMutation.isPending ? 'Uploading…' : '📁 Choose File'}
              </button>
              <span className="text-xs text-gray-500">Max 10 MB · JPEG, PNG, GIF, WebP</span>
            </label>
            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          </section>
        )}

        {/* Gallery */}
        {isLoading && <div className="text-center text-gray-500 py-8">Loading…</div>}

        {!isLoading && images.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            {isDm ? 'No images yet. Upload one above!' : 'No images have been shared with you yet.'}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map(image => (
            <div key={image.id} className="bg-gray-900 rounded-xl overflow-hidden flex flex-col">
              {/* Thumbnail */}
              <button
                onClick={() => setZoomImage(image)}
                className="relative aspect-square overflow-hidden bg-gray-800 hover:opacity-90 transition-opacity"
              >
                <AuthImage
                  apiPath={imageApiPath(image)}
                  alt={image.caption ?? image.fileName}
                  className="w-full h-full object-cover"
                />
                {isDm && !image.isPublished && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-xs text-gray-300 bg-black/60 px-2 py-1 rounded">Unpublished</span>
                  </div>
                )}
                {isDm && image.isPublished && image.publishedToUserIds !== null && (
                  <div className="absolute bottom-1 right-1">
                    <span className="text-[10px] bg-indigo-800/80 text-indigo-200 px-1.5 py-0.5 rounded">
                      {image.publishedToUserIds.length} user{image.publishedToUserIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </button>

              {/* Info + controls */}
              <div className="p-2 flex-1 flex flex-col gap-1">
                {editCaption?.id === image.id ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={editCaption.value}
                      onChange={e => setEditCaption({ id: image.id, value: e.target.value })}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    <button
                      onClick={() => updateMutation.mutate({ imageId: image.id, patch: { caption: editCaption.value } })}
                      className="text-xs text-indigo-400 hover:text-indigo-300 px-1"
                    >✓</button>
                    <button onClick={() => setEditCaption(null)} className="text-xs text-gray-500 px-1">✕</button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 truncate">
                    {image.caption || <span className="text-gray-600 italic">{image.fileName}</span>}
                  </p>
                )}
                <p className="text-[10px] text-gray-600">{formatBytes(image.fileSizeBytes)}</p>

                {isDm && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <button
                      onClick={() => openPublish(image)}
                      className={`text-[10px] px-2 py-1 rounded transition-colors ${
                        image.isPublished
                          ? 'bg-green-900/60 text-green-400 hover:bg-green-900'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {image.isPublished ? '✓ Published' : 'Publish'}
                    </button>
                    {image.isPublished && (
                      <button
                        onClick={() => updateMutation.mutate({ imageId: image.id, patch: { isPublished: false } })}
                        className="text-[10px] px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
                      >Unpublish</button>
                    )}
                    <button
                      onClick={() => setEditCaption({ id: image.id, value: image.caption ?? '' })}
                      className="text-[10px] px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
                    >Edit</button>
                    <button
                      onClick={() => deleteMutation.mutate(image.id)}
                      disabled={deleteMutation.isPending}
                      className="text-[10px] px-2 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50"
                    >Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Publish modal */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setPublishModal(null)}>
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Publish Image</h3>
              <button onClick={() => setPublishModal(null)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={publishToAll}
                  onChange={() => setPublishToAll(true)}
                  className="accent-indigo-500"
                />
                <span className="text-sm">All campaign members</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!publishToAll}
                  onChange={() => setPublishToAll(false)}
                  className="accent-indigo-500"
                />
                <span className="text-sm">Specific players</span>
              </label>
            </div>

            {!publishToAll && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {players.length === 0 && <p className="text-xs text-gray-500">No players in this campaign.</p>}
                {players.map(member => (
                  <label key={member.userId} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(member.userId)}
                      onChange={e => {
                        if (e.target.checked) setSelectedUserIds(ids => [...ids, member.userId])
                        else setSelectedUserIds(ids => ids.filter(x => x !== member.userId))
                      }}
                      className="accent-indigo-500"
                    />
                    <span className="text-sm">{member.username}</span>
                  </label>
                ))}
              </div>
            )}

            {publishModal.isPublished && (
              <p className="text-xs text-gray-500">
                Currently published to:{' '}
                {publishModal.publishedToUserIds === null
                  ? 'all members'
                  : publishModal.publishedToUserIds.length === 0
                    ? 'no one'
                    : publishModal.publishedToUserIds.join(', ')}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setPublishModal(null)} className="px-3 py-2 bg-gray-700 rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => submitPublish(publishModal)}
                disabled={updateMutation.isPending || (!publishToAll && selectedUserIds.length === 0)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
              >
                {updateMutation.isPending ? 'Saving…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom modal */}
      {zoomImage && (
        <ImageZoomModal
          apiPath={imageApiPath(zoomImage)}
          alt={zoomImage.caption ?? zoomImage.fileName}
          onClose={() => setZoomImage(null)}
        />
      )}
    </div>
  )
}
