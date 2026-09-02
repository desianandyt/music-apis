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

        // Public Invidious API instances (Ye Cloudflare workers ke sath acchha kaam karte hain)
        const invidiousInstances = [
          'https://vid.puffyan.us',
          'https://invidious.projectsegfau.lt',
          'https://inv.nadeko.net'
        ]

        let streamUrl = ''
        let detailedError = ''

        for (const instance of invidiousInstances) {
          try {
            const res = await fetch(`${instance}/api/v1/videos/${id}`, {
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
              }
            })
            
            if (res.ok) {
              const json: any = await res.json()
              const adaptiveFormats = json.adaptiveFormats || []
              
              // Audio-only format dhundhna (m4a ya webm)
              const audioFormat = adaptiveFormats.find((f: any) => 
                f.type && f.type.includes('audio/') && f.url
              ) || adaptiveFormats[0]

              if (audioFormat && audioFormat.url) {
                streamUrl = audioFormat.url
                break
              }
            } else {
              detailedError = `Instance ${instance} returned status ${res.status}`
            }
          } catch (err: any) {
            detailedError = err.message
            continue
          }
        }

        if (!streamUrl) {
          return ctx.json({ 
            success: false, 
            message: 'Failed to extract stream from all Invidious instances', 
            debug: detailedError 
          }, 500)
        }

        return ctx.json({
          success: true,
          data: {
            streamUrl: streamUrl,
            mimeType: 'audio/mp4',
            bitrate: 128000
          }
        })
      }
    )
  }
}
