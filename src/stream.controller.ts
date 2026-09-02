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
          // YouTube InnerTube Web Client Payload (Direct & Reliable)
          const ytResponse = await fetch(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyA...`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
              context: {
                client: {
                  clientName: 'WEB',
                  clientVersion: '2.20240101.01.00',
                  platform: 'DESKTOP',
                  hl: 'en',
                  gl: 'US'
                }
              },
              videoId: id
            })
          })

          // Agar YouTube API key parameter ki wajah se block kare, toh hum ek aur aasaan alternative fallback use karenge: Cobalt ya Piped ka official stable endpoint
          if (!ytResponse.ok) {
            // Fallback to a stable public redirect/json extractor
            const fallbackRes = await fetch(`https://co.wuk.sh/api/json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                url: `https://www.youtube.com/watch?v=${id}`,
                isAudioOnly: true
              })
            })
            
            const fallbackData: any = await fallbackRes.json()
            if (fallbackData && fallbackData.url) {
              return ctx.json({
                success: true,
                data: {
                  streamUrl: fallbackData.url,
                  mimeType: 'audio/mp4',
                  bitrate: 128000
                }
              })
            }
            throw new Error('Fallback extractor failed')
          }

          const ytData: any = await ytResponse.json()
          const adaptiveFormats = ytData.streamingData?.adaptiveFormats || []
          
          // Sirf audio formats filter karna
          const audioStream = adaptiveFormats.find((f: any) => 
            f.mimeType && f.mimeType.includes('audio/mp4')
          ) || adaptiveFormats.find((f: any) => f.mimeType && f.mimeType.includes('audio/'))

          if (!audioStream || !audioStream.url) {
            return ctx.json({ success: false, message: 'No direct audio stream found' }, 404)
          }

          return ctx.json({
            success: true,
            data: {
              streamUrl: audioStream.url,
              mimeType: audioStream.mimeType,
              bitrate: audioStream.bitrate || 128000
            }
          })

        } catch (error: any) {
          return ctx.json({ success: false, message: 'Stream extraction error: ' + error.message }, 500)
        }
      }
    )
  }
}
