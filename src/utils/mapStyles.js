/**
 * Unified, reliable map tile and style configurations for MapLibre GL.
 * Uses LocationIQ tiles with automatic fallback to OpenStreetMap (OSM) standard tiles,
 * completely avoiding Carto's "API KEY REQUIRED" watermark.
 */

const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_KEY || 'pk.149c3b20641fe0d7ca20dc86b6fbf2ca'

export const getMapTileUrl = () => {
  if (LOCATIONIQ_KEY && LOCATIONIQ_KEY.startsWith('pk.') && !LOCATIONIQ_KEY.includes('YOUR_')) {
    return `https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}`
  }
  return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
}

export const streetStyle = {
  version: 8,
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: [getMapTileUrl()],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'simple-tiles',
      type: 'raster',
      source: 'raster-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
}

export const satelliteStyle = {
  version: 8,
  sources: {
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '&copy; Esri'
    }
  },
  layers: [
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
}
