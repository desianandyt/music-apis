import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { Home } from './pages/home'
import type { Routes } from '#common/types'
import type { HTTPException } from 'hono/http-exception'

type PipedAudioStream = {
  url: string
  mime?: string
  mimeType?: string
  format?: string
  quality?: string
  bitrate?: number | string
}

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const isHttpUrl = (value: string) => value.startsWith('http://') || value.startsWith('https://')

const isAudioStream = (value: unknown): value is PipedAudioStream => {
  if (!value || typeof value !== 'object') return false
  const stream = value as Partial<PipedAudioStream>
  const descriptor =
    `${stream.mime || ''} ${stream.mimeType || ''} ${stream.format || ''} ${stream.url || ''}`.toLowerCase()
  return (
    typeof stream.url === 'string' &&
    (descriptor.includes('audio') || descriptor.includes('m4a') || descriptor.includes('mp4'))
  )
}

const audioScore = (stream: PipedAudioStream) => {
  const descriptor = `${stream.mime || ''} ${stream.mimeType || ''} ${stream.format || ''} ${stream.url}`.toLowerCase()
  const preferredContainer = descriptor.includes('m4a')
    ? 300
    : descriptor.includes('audio/mp4') || descriptor.includes('mp4')
      ? 200
      : 0
  const bitrate = Number(stream.bitrate) || 0
  return preferredContainer * 1_000_000 + bitrate
}

const compareAudioStreams = (left: PipedAudioStream, right: PipedAudioStream) => audioScore(right) - audioScore(left)

const resolveYouTubeVideoId = async (rawQuery: string): Promise<string | null> => {
  const query = safeDecodeURIComponent(rawQuery).trim()
  if (/^[\w-]{11}$/.test(query)) return query
  if (!query) return null

  const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} audio`)}`, {
    headers: {
      Accept: 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    }
  })
  if (!response.ok) return null

  const html = await response.text()
  const marker = 'var ytInitialData = '
  const start = html.indexOf(marker)
  const end = html.indexOf(';</script>', start)
  if (start < 0 || end < 0) return null

  const data = JSON.parse(html.slice(start + marker.length, end)) as {
    contents?: {
      twoColumnSearchResultsRenderer?: {
        primaryContents?: {
          sectionListRenderer?: {
            contents?: Array<{ itemSectionRenderer?: { contents?: Array<{ videoRenderer?: { videoId?: string } }> } }>
          }
        }
      }
    }
  }

  const items = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || []
  for (const section of items) {
    for (const item of section.itemSectionRenderer?.contents || []) {
      const videoId = item.videoRenderer?.videoId
      if (videoId) return videoId
    }
  }
  return null
}

const resolveCatalogSongToYoutubeId = async (songId: string): Promise<string | null> => {
  const url = new URL('https://www.jiosaavn.com/api.php')
  url.searchParams.set('__call', 'song.getDetails')
  url.searchParams.set('_format', 'json')
  url.searchParams.set('_marker', '0')
  url.searchParams.set('api_version', '4')
  url.searchParams.set('ctx', 'web6dot0')
  url.searchParams.set('pids', songId)

  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Musify/1.2' }
  })
  if (!response.ok) return null

  const payload = (await response.json()) as {
    songs?: Array<{
      song?: string
      title?: string
      primary_artists?: string
      artist_map?: { primary_artists?: Array<{ name?: string }> }
    }>
  }
  const song = payload.songs?.[0]
  if (!song) return null

  const artist =
    song.primary_artists ||
    song.artist_map?.primary_artists
      ?.map((item) => item.name)
      .filter(Boolean)
      .join(', ') ||
    ''
  const title = song.song || song.title || ''
  return resolveYouTubeVideoId(`${title} ${artist}`)
}

export class App {
  private app: OpenAPIHono

  constructor(routes: Routes[]) {
    this.app = new OpenAPIHono()

    this.initializeGlobalMiddlewares()
    this.initializeRoutes(routes)
    this.initializeStreamRoute()
    this.initializeSwaggerUI()
    this.initializeRouteFallback()
    this.initializeErrorHandler()
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach((route) => {
      route.initRoutes()
      this.app.route('/api', route.controller)
    })

    this.app.route('/', Home)
  }

  private initializeGlobalMiddlewares() {
    this.app.use(logger())
    this.app.use(prettyJSON())
    this.app.use(cors())
  }

  private initializeStreamRoute() {
    this.app.get('/api/songs/stream/:id', async (ctx) => {
      const rawId = ctx.req.param('id')
      const id = safeDecodeURIComponent(rawId)

      if (!id.trim()) {
        return ctx.json({ success: false, message: 'Song or YouTube video ID is required' }, 400)
      }

      try {
        const requestedId = id.startsWith('query:')
          ? await resolveYouTubeVideoId(id.slice('query:'.length))
          : id.replace(/^yt-/, '')
        const videoId =
          requestedId && /^[\w-]{11}$/.test(requestedId)
            ? requestedId
            : requestedId
              ? await resolveCatalogSongToYoutubeId(requestedId)
              : null

        if (!videoId) {
          return ctx.json({ success: false, message: 'Could not resolve a playable YouTube video' }, 404)
        }

        const env = ctx.env as { PIPED_API_BASE_URL?: string } | undefined
        const configuredPipedBaseUrl = env?.PIPED_API_BASE_URL || 'https://pipedapi.kavin.rocks'
        const pipedBaseUrl = configuredPipedBaseUrl.endsWith('/')
          ? configuredPipedBaseUrl.slice(0, -1)
          : configuredPipedBaseUrl
        const upstream = await fetch(`${pipedBaseUrl}/streams/${encodeURIComponent(videoId)}`, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Musify/1.2'
          }
        })

        if (!upstream.ok) {
          return ctx.json({ success: false, message: `Piped returned HTTP ${upstream.status}` }, 502)
        }

        const payload = (await upstream.json()) as { audioStreams?: unknown }
        const audioStreams = Array.isArray(payload.audioStreams) ? payload.audioStreams : []
        const candidates = audioStreams.filter(isAudioStream).filter((stream) => isHttpUrl(stream.url))

        if (candidates.length === 0) {
          return ctx.json({ success: false, message: 'No playable audio stream was returned by Piped' }, 404)
        }

        const selected = [...candidates].sort(compareAudioStreams)[0]
        return ctx.json({
          success: true,
          data: {
            url: selected.url,
            mimeType: selected.mime || selected.mimeType || null,
            format: selected.format || null,
            quality: selected.quality || null,
            bitrate: selected.bitrate || null,
            videoId
          }
        })
      } catch (error) {
        console.error('Stream resolution failed:', error)
        return ctx.json({ success: false, message: 'Unable to resolve the audio stream right now' }, 502)
      }
    })
  }

  private initializeSwaggerUI() {
    this.app.doc31('/swagger', (c) => {
      const { protocol: urlProtocol, hostname, port } = new URL(c.req.url)
      const protocol = c.req.header('x-forwarded-proto') ? `${c.req.header('x-forwarded-proto')}:` : urlProtocol

      return {
        openapi: '3.1.0',

        info: {
          version: '1.0.0',
          title: 'JioSaavn API',
          description: `# Introduction 
        \nJioSaavn API, accessible at [saavn.dev](https://saavn.dev), is an unofficial API that allows users to download high-quality songs from [JioSaavn](https://jiosaavn.com). 
        It offers a fast, reliable, and easy-to-use API for developers. \n`
        },
        servers: [{ url: `${protocol}//${hostname}${port ? `:${port}` : ''}`, description: 'Current environment' }]
      }
    })

    this.app.get(
      '/docs',
      apiReference({
        pageTitle: 'JioSaavn API Documentation',
        theme: 'deepSpace',
        isEditable: false,
        layout: 'modern',
        darkMode: true,
        metaData: {
          applicationName: 'JioSaavn API',
          author: 'Sumit Kolhe',
          creator: 'Sumit Kolhe',
          publisher: 'Sumit Kolhe',
          robots: 'index, follow',
          description:
            'JioSaavn API is an unofficial wrapper written in TypeScript for jiosaavn.com providing programmatic access to a vast library of songs, albums, artists, playlists, and more.'
        },
        url: '/swagger'
      })
    )
  }

  private initializeRouteFallback() {
    this.app.notFound((ctx) => {
      return ctx.json({ success: false, message: 'route not found, check docs at https://saavn.dev/docs' }, 404)
    })
  }

  private initializeErrorHandler() {
    this.app.onError((err, ctx) => {
      const error = err as HTTPException
      return ctx.json({ success: false, message: error.message }, error.status || 500)
    })
  }

  public getApp() {
    return this.app
  }
}
