import { OpenAPIHono } from '@hono/zod-openapi'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Routes } from '#common/types'
import { searchYouTube, youtubeSearchLimits } from '#modules/youtube/helpers'
import { YouTubeSearchModel } from '#modules/youtube/models'

const YouTubeSearchQuery = z.object({
  query: z.string().trim().min(1).max(youtubeSearchLimits.maxQueryLength),
  page: z.coerce.number().int().min(0).max(youtubeSearchLimits.maxPage).default(0),
  limit: z.coerce.number().int().min(1).max(youtubeSearchLimits.maxLimit).default(10)
})

export class YouTubeController implements Routes {
  controller = new OpenAPIHono()

  initRoutes() {
    this.controller.get('/youtube/search', zValidator('query', YouTubeSearchQuery), async (ctx) => {
      const { query, page, limit } = ctx.req.valid('query')

      try {
        const data = await searchYouTube(query, page, limit)
        const parsed = YouTubeSearchModel.parse(data)
        return ctx.json({ success: true, data: parsed }, 200)
      } catch (error) {
        console.warn('youtube_search_unavailable', error instanceof Error ? error.message : 'unknown error')
        return ctx.json({ success: false, message: 'YouTube search is temporarily unavailable' }, 503)
      }
    })
  }
}
