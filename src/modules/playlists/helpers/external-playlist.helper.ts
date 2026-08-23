type ImportedSong = {
  id: string
  name: string
  primaryArtists: string
  image: Array<{ url: string; quality: string }>
  downloadUrl: Array<{ url: string; quality: string }>
}

export type ExternalPlaylistImport = {
  provider: 'spotify' | 'youtube'
  name: string
  description: string
  coverUrl: string
  tracks: ImportedSong[]
  totalTracks: number
}

const decodeHtml = (value: string) =>
  value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim()

const toSong = ({
  id,
  title,
  artist,
  coverUrl
}: {
  id: string
  title: string
  artist: string
  coverUrl: string
}): ImportedSong => ({
  id,
  name: decodeHtml(title),
  primaryArtists: decodeHtml(artist.replace(' - Topic', '').replace('VEVO', '')),
  image: coverUrl ? [{ url: coverUrl, quality: '500x500' }] : [],
  downloadUrl: []
})

export const extractYouTubePlaylistId = (url: string) => {
  try {
    const parsed = new URL(url)
    const id = parsed.searchParams.get('list')
    return id && /^[\w-]+$/.test(id) ? id : null
  } catch {
    return url.match(/[?&]list=([\w-]+)/i)?.[1] || null
  }
}

export const extractSpotifyEntity = (url: string): { type: 'playlist' | 'album' | 'track'; id: string } | null => {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.toLowerCase().endsWith('spotify.com')) return null
    const parts = parsed.pathname.split('/').filter(Boolean)
    const typeIndex = parts.findIndex((part) => part === 'playlist' || part === 'album' || part === 'track')
    const type = parts[typeIndex]
    const id = parts[typeIndex + 1]
    return type && id && /^\w+$/.test(id) ? { type: type as 'playlist' | 'album' | 'track', id } : null
  } catch {
    return null
  }
}

const extractJsonScript = (html: string, openingTag: string) => {
  const start = html.indexOf(openingTag)
  if (start < 0) return null
  const contentStart = start + openingTag.length
  const contentEnd = html.indexOf('</script>', contentStart)
  return contentEnd < 0 ? null : html.slice(contentStart, contentEnd)
}

const fetchYouTubePlaylist = async (listId: string): Promise<ExternalPlaylistImport> => {
  const response = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`, {
    headers: {
      Accept: 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    }
  })
  if (!response.ok) throw new Error(`YouTube returned HTTP ${response.status}`)

  const html = await response.text()
  const json = extractJsonScript(html, 'var ytInitialData = ')
  if (!json) throw new Error('Could not parse the YouTube playlist')

  const data = JSON.parse(json) as any
  const header = data?.header?.playlistHeaderRenderer || data?.metadata?.playlistMetadataRenderer || {}
  const name =
    header?.title?.simpleText ||
    header?.title?.runs?.[0]?.text ||
    data?.microformat?.microformatDataRenderer?.title ||
    'Imported YouTube Playlist'
  const description = header?.description?.simpleText || header?.description?.runs?.[0]?.text || 'Imported from YouTube'
  const coverUrl =
    header?.playlistHeaderBanner?.heroDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    data?.microformat?.microformatDataRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    ''
  const videoList =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
      ?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || []

  const tracks = videoList.flatMap((item: any) => {
    const video = item?.playlistVideoRenderer
    if (!video?.videoId) return []
    const thumb =
      video?.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
    return [
      toSong({
        id: video.videoId,
        title: video?.title?.runs?.[0]?.text || video?.title?.simpleText || 'Unknown Track',
        artist: video?.shortBylineText?.runs?.[0]?.text || video?.shortBylineText?.simpleText || 'YouTube Artist',
        coverUrl: thumb
      })
    ]
  })

  return {
    provider: 'youtube',
    name,
    description,
    coverUrl: coverUrl || tracks[0]?.image[0]?.url || '',
    tracks,
    totalTracks: tracks.length
  }
}

const fetchSpotifyPlaylist = async (
  type: 'playlist' | 'album' | 'track',
  id: string
): Promise<ExternalPlaylistImport> => {
  const response = await fetch(`https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}`, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    }
  })
  if (!response.ok) throw new Error(`Spotify returned HTTP ${response.status}`)

  const html = await response.text()
  const json = extractJsonScript(html, '<script id="__NEXT_DATA__" type="application/json">')
  if (!json) throw new Error('Could not parse the Spotify playlist')

  const data = JSON.parse(json) as any
  const entity = data?.props?.pageProps?.state?.data?.entity
  if (!entity) throw new Error('Spotify playlist data is unavailable')

  const name = entity.name || entity.title || `Imported Spotify ${type}`
  const description = entity.description || `Imported ${type} from Spotify`
  const coverUrl = entity?.coverArt?.sources?.[0]?.url || entity?.images?.[0]?.url || ''
  const trackList = Array.isArray(entity.trackList) ? entity.trackList : []
  const tracks = trackList.flatMap((item: any) => {
    const title = item?.title || item?.name
    if (!title) return []
    const artist = item?.subtitle || item?.artists?.[0]?.name || 'Spotify Artist'
    return [toSong({ id: `query:${encodeURIComponent(`${title} ${artist}`)}`, title, artist, coverUrl })]
  })

  return { provider: 'spotify', name, description, coverUrl, tracks, totalTracks: tracks.length }
}

export const importExternalPlaylist = (url: string): Promise<ExternalPlaylistImport> => {
  const youtubeId = extractYouTubePlaylistId(url)
  if (youtubeId && (url.toLowerCase().includes('youtube.com') || url.toLowerCase().includes('youtu.be'))) {
    return fetchYouTubePlaylist(youtubeId)
  }

  const spotifyEntity = extractSpotifyEntity(url)
  if (spotifyEntity) return fetchSpotifyPlaylist(spotifyEntity.type, spotifyEntity.id)

  throw new Error('Unsupported link. Please paste a valid JioSaavn, Spotify, or YouTube playlist link.')
}
