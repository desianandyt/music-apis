# JioSaavn API

![GitHub License](https://img.shields.io/github/license/sumitkolhe/jiosaavn-api)
![GitHub Release](https://img.shields.io/github/v/release/sumitkolhe/jiosaavn-api)

An Unofficial API for downloading high-quality songs, albums, playlists, and more from [JioSaavn](https://jiosaavn.com).

## 📚 Documentation

Check out the [API documentation](https://saavn.dev/docs) for detailed information on how to use the API.

## 📰 Changelog

For a detailed list of changes, see the [CHANGELOG](CHANGELOG.md).

## 🔌 Running Locally

1. Clone the repository:

   ```sh
   git clone https://github.com/sumitkolhe/jiosaavn-api
   cd jiosaavn-api
   ```

### Using Docker

```sh
docker-compose up
```

OR

### Manually

> [!NOTE]
> You need `Bun(1.0.29+)` or `Node.js(v20+)`

2. Install the required dependencies:

   ```sh
   bun install
   ```

3. Launch the development server:

   ```sh
   bun run dev
   ```

## ☁️ Deploying Your Own Instance

JioSaavn API can be deployed to either Cloudflare Workers or Vercel. Below are the instructions for deploying to each platform.

### Cloudflare Workers

[![Deploy with Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sumitkolhe/jiosaavn-api)

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sumitkolhe/jiosaavn-api)

## Combined song search: JioSaavn + YouTube metadata

The existing authenticated song-search endpoint now combines JioSaavn results with best-effort public YouTube InnerTube metadata results:

```text
GET /api/search/songs?query=Imagine%20Dragons%20Believer&limit=10&page=0
x-api-key: ak_live_...
```

The response keeps the existing `data.results` contract. JioSaavn items retain their normal playable/downloadable fields; YouTube items are interleaved into the same array and carry `source: "youtube"`, `youtubeVideoId`, `watchUrl`, and `isDownloadable: false`, with an empty `downloadUrl`. The Android client should open `watchUrl` on YouTube for these items and must not treat the YouTube watch URL as a direct audio stream.

InnerTube is an undocumented provider and may change or become unavailable. Its failure is isolated with a timeout and fallback: JioSaavn results continue to return even when YouTube cannot be reached. The provider is queried with bounded query, page, and limit values. Musify must retain an accessible privacy policy and YouTube Terms of Service link before exposing YouTube-powered features to end users.

## 📜 License

This project is distributed under the [MIT License](https://opensource.org/licenses/MIT). For more information, see the [LICENSE](LICENSE) file included in this repository.
