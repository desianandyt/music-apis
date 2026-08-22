import type { YouTubeSearch, YouTubeSong } from '#modules/youtube/models'

const YOUTUBE_HOME_URL = 'https://www.youtube.com/'
const YOUTUBE_SEARCH_URL = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false'
const MAX_QUERY_LENGTH = 120
const MAX_LIMIT = 20
const REQUEST_TIMEOUT_MS = 8_000
const CONFIG_CACHE_MS = 10 * 60 * 1_000

interface YouTubeClientConfig {
  apiKey: string
  clientVersion: string
}

interface TextRun {
  text?: string
}

interface VideoRenderer {
  videoId?: string
  title?: { runs?: TextRun[]; simpleText?: string }
  ownerText?: { runs?: TextRun[]; simpleText?: string }
  lengthText?: { simpleText?: string }
  viewCountText?: { simpleText?: string }
  publishedTimeText?: { simpleText?: string }
  thumbnail?: { thumbnails?: Array<{ url?: string }> }
}

let cachedConfig: { value: YouTubeClientConfig; expiresAt: number } | undefined

const textValue = (value?: { runs?: TextRun[]; simpleText?: string }): string => {
  if (value?.simpleText) return value.simpleText.trim()
  return value?.runs?.map((run) => run.text || '').join('').trim() || ''
}

const parseDuration = (value: string): number | null => {
  if (!/^\d{1,2}(?::\d{2}){1,2}$/.test(value)) return null
  const parts = value.split(':').map(Number)
  if (parts.some((part) => !Number.isFinite(part))) return null
  return parts.reduce((total, part) => total * 60 + part, 0)
}

const parseCount = (value: string): number | null => {
  const normalized = value.replace(/[^0-9.]/g, '')
  if (!normalized) return null
  const number = Number(normalized)
  if (!Number.isFinite(number)) return null
  const suffix = value.match(/([mbk])\b/i)?.[1].toLowerCase()
  if (suffix) {
    const multiplier = suffix === 'b' ? 1_000_000_000 : suffix === 'm' ? 1_000_000 : 1_000
    return Math.round(number * multiplier)
  }
  return Math.round(number)
}

const findVideoRenderers = (value: unknown): VideoRenderer[] => {
  const results: VideoRenderer[] = []
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if ('videoRenderer' in node) {
      const renderer = (node as { videoRenderer?: unknown }).videoRenderer
      if (renderer && typeof renderer === 'object') results.push(renderer as VideoRenderer)
    }
    for (const child of Object.values(node)) visit(child)
  }
  visit(value)
  return results
}

const findInnertubeConfig = (html: string): YouTubeClientConfig => {
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1]
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1]
  if (!apiKey || !clientVersion) throw new Error('YouTube client configuration unavailable')
  return { apiKey, clientVersion }
}

const getInnertubeConfig = async (): Promise<YouTubeClientConfig> => {
  if (cachedConfig && cachedConfig.expiresAt > Date.now()) return cachedConfig.value
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(YOUTUBE_HOME_URL, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; MusifyCatalog/1.0)' },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`YouTube home returned ${response.status}`)
    const config = findInnertubeConfig(await response.text())
    cachedConfig = { value: config, expiresAt: Date.now() + CONFIG_CACHE_MS }
    return config
  } finally {
    clearTimeout(timeout)
  }
}

const createArtist = (name: string) => ({
  id: `youtube-artist:${encodeURIComponent(name.toLowerCase())}`,
  name,
  role: 'primary_artist',
  type: 'artist',
  image: [],
  url: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`
})

export const mapVideoRenderer = (renderer: VideoRenderer): YouTubeSong | null => {
  const videoId = renderer.videoId?.trim()
  const title = textValue(renderer.title)
  if (!videoId || !title) return null
  const artistName = textValue(renderer.ownerText) || 'YouTube'
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
  const thumbnail = renderer.thumbnail?.thumbnails?.at(-1)?.url || `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
  const duration = parseDuration(textValue(renderer.lengthText))
  const artist = createArtist(artistName)
  const published = textValue(renderer.publishedTimeText)

  return {
    id: `youtube:${videoId}`,
    name: title,
    type: 'youtube',
    year: published.match(/\b(19|20)\d{2}\b/)?.[0] || null,
    releaseDate: null,
    duration,
    label: null,
    explicitContent: false,
    playCount: parseCount(textValue(renderer.viewCountText)),
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

export const searchYouTube = async (query: string, page = 0, limit = 10): Promise<YouTubeSearch> => {
  const normalizedQuery = query.trim().slice(0, MAX_QUERY_LENGTH)
  const normalizedPage = Math.max(0, Math.min(Math.floor(page), 100))
  const normalizedLimit = Math.max(1, Math.min(Math.floor(limit), MAX_LIMIT))
  if (!normalizedQuery) return { total: 0, start: normalizedPage * normalizedLimit, results: [], source: 'youtube', providerAvailable: true }

  const config = await getInnertubeConfig()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${YOUTUBE_SEARCH_URL}&key=${encodeURIComponent(config.apiKey)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; MusifyCatalog/1.0)'
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: config.clientVersion, hl: 'en', gl: 'US' } },
        query: normalizedQuery
      }),
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`YouTube search returned ${response.status}`)
    const payload = await response.json()
    const results = findVideoRenderers(payload)
      .map(mapVideoRenderer)
      .filter((song): song is YouTubeSong => Boolean(song))
    const start = normalizedPage * normalizedLimit
    return {
      total: results.length,
      start,
      results: results.slice(start, start + normalizedLimit),
      source: 'youtube',
      providerAvailable: true
    }
  } finally {
    clearTimeout(timeout)
  }
}

export const youtubeSearchLimits = { maxQueryLength: MAX_QUERY_LENGTH, maxLimit: MAX_LIMIT, timeoutMs: REQUEST_TIMEOUT_MS }
