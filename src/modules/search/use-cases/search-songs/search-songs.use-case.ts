import { Endpoints } from '#common/constants'
import { useFetch } from '#common/helpers'
import { createSongPayload } from '#modules/songs/helpers'
import { searchYouTube } from '#modules/youtube/helpers'
import type { IUseCase } from '#common/types'
import type { SearchSongAPIResponseModel, SearchSongModel } from '#modules/search/models'
import type { z } from 'zod'

export interface SearchSongsArgs {
  query: string
  page: number
  limit: number
}

export class SearchSongsUseCase implements IUseCase<SearchSongsArgs, z.infer<typeof SearchSongModel>> {
  async execute({ query, limit, page }: SearchSongsArgs): Promise<z.infer<typeof SearchSongModel>> {
    const youtubeLimit = Math.max(1, Math.ceil(limit / 2))
    const [jioResult, youtubeResult] = await Promise.all([
      useFetch<z.infer<typeof SearchSongAPIResponseModel>>({
        endpoint: Endpoints.search.songs,
        params: {
          q: query,
          p: page,
          n: limit
        }
      }),
      searchYouTube(query, page, youtubeLimit).catch((error) => {
        console.warn('youtube_search_fallback', error instanceof Error ? error.message : 'unknown error')
        return null
      })
    ])

    const jioSongs = jioResult.data.results?.map(createSongPayload) || []
    const youtubeSongs = youtubeResult?.results || []
    const combinedResults: z.infer<typeof SearchSongModel>['results'] = []
    const maxItems = Math.max(jioSongs.length, youtubeSongs.length)

    for (let index = 0; index < maxItems && combinedResults.length < limit; index += 1) {
      if (jioSongs[index]) combinedResults.push(jioSongs[index])
      if (youtubeSongs[index] && combinedResults.length < limit) combinedResults.push(youtubeSongs[index])
    }

    return {
      total: jioResult.data.total + (youtubeResult?.total || 0),
      start: jioResult.data.start,
      results: combinedResults
    }
  }
}
