import { ClientType, Innertube } from 'youtubei.js/cf-worker'
import type { YTNodes } from 'youtubei.js/cf-worker'
import type { YouTubeSearch, YouTubeSong } from '#modules/youtube/models'

const MAX_QUERY_LENGTH = 120
const MAX_LIMIT = 20
const MAX_PAGE = 20
const MAX_CONTINUATIONS = 8
const REQUEST_TIMEOUT_MS = 10_000

const MUSIC_TITLE_PATTERN = /\b(?:official\s+(?:audio|music\s+video|video)|music|song|lyrics?|audio|soundtrack|ost|album|remix|cover|acoustic|karaoke|concert|live)\b/i
const NON_MUSIC_TITLE_PATTERN = /\b(?:reaction|review|tutorial|interview|podcast|news|gameplay|walkthrough|vlog|explained|shorts?)\b/i

interface TextLike {
  toString(): string
}

interface VideoNodeLike {
  type?: string
  video_id?: string
  title?: TextLike
  author?: { name?: string; url?: string }
  thumbnails?: Array<{ url?: string }>
  length_text?: TextLike
  view_count?: TextLike
  short_view_count?: TextLike
  published?: TextLike
  is_live?: boolean
  is_upcoming?: boolean
  duration?: { seconds?: number; text?: string }
}

interface LegacyText {
  runs?: Array<{ text?: string }>
  simpleText?: string
}

interface LegacyVideoRenderer {
  videoId?: string
  title?: LegacyText
  ownerText?: LegacyText
  lengthText?: LegacyText
  viewCountText?: LegacyText
  publishedTimeText?: LegacyText
  thumbnail?: { thumbnails?: Array<{ url?: string }> }
}

type SearchResponse = Awaited<ReturnType<Awaited<ReturnType<typeof getInnertube>>['search']>>

let clientPromise: Promise<Awaited<ReturnType<typeof Innertube.create>>> | undefined

const getInnertube = async () => {
  if (!clientPromise) {
    clientPromise = Innertube.create({
      client_type: ClientType.WEB,
      lang: 'en',
      location: 'US',
      retrieve_player: false,
      enable_session_cache: false,
      fail_fast: false
    }).catch((error) => {
      clientPromise = undefined
      throw error
    })
  }
  return clientPromise
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('YouTube search timed out')), timeoutMs)
      })
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

const textValue = (value: TextLike | undefined): string => {
  if (!value) return ''
  try {
    return value.toString().trim()
  } catch {
    return ''
  }
}

const legacyTextValue = (value: LegacyText | undefined): string => {
  if (!value) return ''
  if (value.simpleText) return value.simpleText.trim()
  return value.runs?.map((run) => run.text || '').join('').trim() || ''
}

const asTextLike = (value: string): TextLike | undefined => (value ? { toString: () => value } : undefined)

const parseDuration = (value: string, fallback?: number): number | null => {
  if (Number.isFinite(fallback) && fallback !== undefined && fallback > 0) return Math.floor(fallback)
  const parts = value.split(':').map((part) => Number(part))
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) return null
  return parts.reduce((total, part) => total * 60 + part, 0)
}

const parseCount = (value: string): number | null => {
  const normalized = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([kmb])?/i)
  if (!normalized) return null
  const base = Number(normalized[1])
  if (!Number.isFinite(base)) return null
  const suffix = normalized[2]?.toLowerCase()
  const multiplier = suffix === 'b' ? 1_000_000_000 : suffix === 'm' ? 1_000_000 : suffix === 'k' ? 1_000 : 1
  return Math.round(base * multiplier)
}

const createArtist = (name: string, url?: string) => ({
  id: `youtube-artist:${encodeURIComponent(name.toLowerCase())}`,
  name,
  role: 'primary_artist',
  type: 'artist',
  image: [],
  url: url || `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`
})

const isVideoNode = (node: unknown): node is YTNodes.Video => {
  return Boolean(node && typeof node === 'object' && (node as { type?: unknown }).type === 'Video')
}

const isLikelyMusicVideo = (video: VideoNodeLike, query: string, duration: number | null): boolean => {
  const title = textValue(video.title)
  if (!title || video.is_live || video.is_upcoming || NON_MUSIC_TITLE_PATTERN.test(title)) return false
  if (duration !== null && duration < 45) return false
  if (MUSIC_TITLE_PATTERN.test(title)) return true

  const queryTokens = query.toLowerCase().split(/\s+/).filter((token) => token.length >= 3)
  const matches = queryTokens.filter((token) => title.toLowerCase().includes(token)).length
  return matches >= Math.max(1, Math.ceil(queryTokens.length / 2)) && (duration === null || duration >= 90)
}

const mapVideoLike = (video: VideoNodeLike, query = ''): YouTubeSong | null => {
  const videoId = video.video_id?.trim()
  const title = textValue(video.title)
  if (!videoId || !title) return null

  const duration = parseDuration(textValue(video.length_text), video.duration?.seconds)
  if (!isLikelyMusicVideo(video, query, duration)) return null

  const artistName = video.author?.name?.trim() || 'YouTube'
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
  const thumbnail = video.thumbnails?.at(-1)?.url || `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
  const artist = createArtist(artistName, video.author?.url)
  const published = textValue(video.published)

  return {
    id: `youtube:${videoId}`,
    name: title,
    type: 'youtube',
    year: published.match(/\b(?:19|20)\d{2}\b/)?.[0] || null,
    releaseDate: null,
    duration,
    label: null,
    explicitContent: false,
    playCount: parseCount(textValue(video.view_count) || textValue(video.short_view_count)),
    language: 'unknown',
    hasLyrics: false,
    lyricsId: null,
    url: watchUrl,
    copyright: 'Content provided by YouTube; playback opens on YouTube.',
    album: { id: null, name: 'YouTube', url: null },
    artists: { primary: [artist], featured: [], all: [artist] },
    image: [{ quality: 'default', url: thumbnail }],
    downloadUrl: [],
    source: 'youtube',
    youtubeVideoId: videoId,
    watchUrl,
    isDownloadable: false
  }
}

export const mapVideoNode = (node: YTNodes.Video, query = ''): YouTubeSong | null =>
  mapVideoLike(node as unknown as VideoNodeLike, query)

/**
 * Backward-compatible mapper for the legacy raw videoRenderer test/adapter shape.
 * New production code should consume parsed YTNodes.Video values through mapVideoNode.
 */
export const mapVideoRenderer = (renderer: LegacyVideoRenderer, query = ''): YouTubeSong | null => {
  const durationText = legacyTextValue(renderer.lengthText)
  const viewCountText = legacyTextValue(renderer.viewCountText)
  const title = legacyTextValue(renderer.title)
  const owner = legacyTextValue(renderer.ownerText)
  const published = legacyTextValue(renderer.publishedTimeText)
  const thumbnails = renderer.thumbnail?.thumbnails?.flatMap((item) => (item.url ? [{ url: item.url }] : [])) || []

  return mapVideoLike(
    {
      type: 'Video',
      video_id: renderer.videoId,
      title: asTextLike(title),
      author: { name: owner },
      thumbnails,
      length_text: asTextLike(durationText),
      view_count: asTextLike(viewCountText),
      published: asTextLike(published)
    },
    query
  )
}

const collectMusicResults = async (query: string, page: number, limit: number, response: SearchResponse) => {
  const start = page * limit
  const end = start + limit
  const results: YouTubeSong[] = []
  const seen = new Set<string>()
  let current = response

  for (let continuation = 0; continuation <= MAX_CONTINUATIONS && results.length < end; continuation += 1) {
    for (const node of current.results || []) {
      if (!isVideoNode(node) || seen.has(node.video_id)) continue
      seen.add(node.video_id)
      const song = mapVideoNode(node, query)
      if (song) results.push(song)
    }

    if (results.length >= end || continuation === MAX_CONTINUATIONS) break
    try {
      current = await current.getContinuation()
    } catch {
      break
    }
  }

  return { current, results: results.slice(start, end) }
}

export const searchYouTube = async (query: string, page = 0, limit = 10): Promise<YouTubeSearch> => {
  const normalizedQuery = query.trim().slice(0, MAX_QUERY_LENGTH)
  const normalizedPage = Math.max(0, Math.min(Math.floor(page), MAX_PAGE))
  const normalizedLimit = Math.max(1, Math.min(Math.floor(limit), MAX_LIMIT))
  const start = normalizedPage * normalizedLimit

  if (!normalizedQuery) {
    return { total: 0, start, results: [], source: 'youtube', providerAvailable: true }
  }

  const client = await getInnertube()
  const initialResponse = await withTimeout(client.search(normalizedQuery, { type: 'video' }), REQUEST_TIMEOUT_MS)
  const { current, results } = await withTimeout(
    collectMusicResults(normalizedQuery, normalizedPage, normalizedLimit, initialResponse),
    REQUEST_TIMEOUT_MS
  )

  const estimated = Number(current.estimated_results)
  return {
    total: Number.isFinite(estimated) && estimated > 0 ? estimated : start + results.length,
    start,
    results,
    source: 'youtube',
    providerAvailable: true
  }
}

export const youtubeSearchLimits = {
  maxQueryLength: MAX_QUERY_LENGTH,
  maxLimit: MAX_LIMIT,
  maxPage: MAX_PAGE,
  timeoutMs: REQUEST_TIMEOUT_MS
}
