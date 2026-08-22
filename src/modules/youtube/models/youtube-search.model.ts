import { DownloadLinkModel } from '#common/models'
import { ArtistMapModel } from '#modules/artists/models/artist-map.model'
import { z } from 'zod'

export const YouTubeSongModel = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('youtube'),
  year: z.string().nullable(),
  releaseDate: z.string().nullable(),
  duration: z.number().nullable(),
  label: z.string().nullable(),
  explicitContent: z.boolean(),
  playCount: z.number().nullable(),
  language: z.string(),
  hasLyrics: z.literal(false),
  lyricsId: z.null(),
  url: z.string().url(),
  copyright: z.string().nullable(),
  album: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    url: z.string().url().nullable()
  }),
  artists: z.object({
    primary: z.array(ArtistMapModel),
    featured: z.array(ArtistMapModel),
    all: z.array(ArtistMapModel)
  }),
  image: z.array(DownloadLinkModel),
  downloadUrl: z.array(DownloadLinkModel),
  source: z.literal('youtube'),
  youtubeVideoId: z.string(),
  watchUrl: z.string().url(),
  isDownloadable: z.literal(false)
})

export const YouTubeSearchModel = z.object({
  total: z.number(),
  start: z.number(),
  results: z.array(YouTubeSongModel),
  source: z.literal('youtube'),
  providerAvailable: z.boolean()
})

export type YouTubeSong = z.infer<typeof YouTubeSongModel>
export type YouTubeSearch = z.infer<typeof YouTubeSearchModel>
