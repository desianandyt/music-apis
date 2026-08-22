import { describe, expect, it } from 'vitest'
import { mapVideoRenderer } from '#modules/youtube/helpers'

describe('YouTube search normalization', () => {
  it('maps public video metadata without creating a download URL', () => {
    const song = mapVideoRenderer({
      videoId: 'abc123',
      title: { runs: [{ text: 'Believer (Official Video)' }] },
      ownerText: { simpleText: 'Imagine Dragons' },
      lengthText: { simpleText: '3:24' },
      viewCountText: { simpleText: '12M views' },
      publishedTimeText: { simpleText: '6 years ago' },
      thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' }] }
    })

    expect(song).not.toBeNull()
    expect(song?.id).toBe('youtube:abc123')
    expect(song?.type).toBe('youtube')
    expect(song?.url).toBe('https://www.youtube.com/watch?v=abc123')
    expect(song?.watchUrl).toBe('https://www.youtube.com/watch?v=abc123')
    expect(song?.duration).toBe(204)
    expect(song?.playCount).toBe(12_000_000)
    expect(song?.downloadUrl).toEqual([])
    expect(song?.isDownloadable).toBe(false)
  })

  it('ignores renderers without a video id or title', () => {
    expect(mapVideoRenderer({ videoId: 'missing-title' })).toBeNull()
    expect(mapVideoRenderer({ title: { simpleText: 'missing-id' } })).toBeNull()
  })
})
