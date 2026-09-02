import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

export class StreamController {
  public controller: OpenAPIHono

  constructor() {
    this.controller = new OpenAPIHono()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/stream/{id}',
        request: {
          params: z.object({
            id: z.string().openapi({ description: 'YouTube Video ID' })
          })
        },
        responses: {
          200: { description: 'Returns the ad-free audio stream URL' },
          400: { description: 'Bad Request' },
          404: { description: 'Stream Not Found' },
          500: { description: 'Server Error' }
        }
      }),
      async (ctx) => {
        const { id } = ctx.req.valid('param')
        try {
          // Piped API se direct audio link fetch karna
          const response = await fetch(`https://pipedapi.kavin.rocks/streams/${id}`)
          const data: any = await response.json()

          if (data.error) {
            return ctx.json({ success: false, message: data.error }, 400)
          }

          // Sabse best audio/mp4 (m4a) stream nikalna
          const audioStreams = data.audioStreams || []
          const bestStream = audioStreams.find((s: any) => s.mimeType.includes('audio/mp4')) || audioStreams[0]

          if (!bestStream) {
            return ctx.json({ success: false, message: 'No audio streams found' }, 404)
          }

          return ctx.json({
            success: true,
            data: {
              streamUrl: bestStream.url,
              mimeType: bestStream.mimeType,
              bitrate: bestStream.bitrate
            }
          })
        } catch (error) {
          return ctx.json({ success: false, message: 'Failed to fetch stream from YouTube bypass' }, 500)
        }
      }
    )
  }
}
