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

        // Multiple Public Piped API instances (Backup system)
        const pipedInstances = [
          'https://pipedapi.kavin.rocks',
          'https://pipedapi.projectsegfau.lt',
          'https://pipedapi.libre.tube'
        ]

        let data: any = null

        // Ek-ek karke sabhi instances par try karenge jab tak data na mil jaye
        for (const instance of pipedInstances) {
          try {
            const response = await fetch(`${instance}/streams/${id}`)
            if (response.ok) {
              const json: any = await response.json()
              if (json && !json.error) {
                data = json
                break // Sahi data milte hi loop rok do
              }
            }
          } catch (e) {
            continue // Agar ek fail ho, toh agle par jao
          }
        }

        if (!data) {
          return ctx.json({ success: false, message: 'Failed to fetch stream from all YouTube bypass instances' }, 500)
        }

        // Sabse best audio/mp4 (m4a) stream nikalna
        const audioStreams = data.audioStreams || []
        const bestStream = audioStreams.find((s: any) => s.mimeType && s.mimeType.includes('audio/mp4')) || audioStreams[0]

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
      }
    )
  }
}
