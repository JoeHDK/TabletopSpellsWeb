export interface SessionNote {
  id: string
  gameRoomId: string
  title: string
  content: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CampaignLogEntry {
  id: string
  gameRoomId: string
  authorUserId: string
  authorUsername: string
  title?: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface CampaignImage {
  id: string
  gameRoomId: string
  uploaderUserId: string
  fileName: string
  contentType: string
  fileSizeBytes: number
  caption: string | null
  isPublished: boolean
  publishedToUserIds: string[] | null
  createdAt: string
}
