import type { SpeechProvider } from '@xsai-ext/providers/utils'

const FISH_AUDIO_BASE_URL = 'https://api.fish.audio/'

export interface FishAudioConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  referenceId?: string
  format?: 'wav' | 'pcm' | 'mp3' | 'opus'
  sampleRate?: number
  temperature?: number
  topP?: number
}

export interface FishAudioVoiceInfo {
  id: string
  title: string
  description?: string
  tags?: string[]
  author?: {
    id: string
    name: string
    avatar_url?: string
  }
}

export function createFishAudioProvider(config: FishAudioConfig): SpeechProvider {
  const baseUrl = config.baseUrl?.endsWith('/') ? config.baseUrl : config.baseUrl ? `${config.baseUrl}/` : FISH_AUDIO_BASE_URL

  return {
    speech: () => ({
      baseURL: baseUrl,
      model: config.model || 's2-pro',
      voice: config.referenceId,
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : (input as URL).toString()

        if (!init?.body || typeof init.body !== 'string') {
          throw new Error('Request body is required')
        }

        const body = JSON.parse(init.body)
        const requestModel = body.model || config.model || 's2-pro'

        const requestBody: Record<string, unknown> = {
          text: body.input,
          reference_id: body.voice || config.referenceId || null,
          format: config.format || 'mp3',
          temperature: config.temperature ?? 0.7,
          top_p: config.topP ?? 0.7,
        }

        if (config.sampleRate) {
          requestBody.sample_rate = config.sampleRate
        }

        const response = await fetch(`${baseUrl}v1/tts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'model': requestModel,
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Fish Audio API error: ${response.status} ${response.statusText} - ${errorText}`)
        }

        return response
      },
    }),
  }
}

export async function listFishAudioModels(apiKey: string, baseUrl?: string): Promise<FishAudioVoiceInfo[]> {
  const url = baseUrl?.endsWith('/') ? baseUrl : baseUrl ? `${baseUrl}/` : FISH_AUDIO_BASE_URL

  const response = await fetch(`${url}model`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to list Fish Audio models: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data
}

export async function listFishAudioVoices(apiKey: string, baseUrl?: string): Promise<FishAudioVoiceInfo[]> {
  const url = baseUrl?.endsWith('/') ? baseUrl : baseUrl ? `${baseUrl}/` : FISH_AUDIO_BASE_URL

  const response = await fetch(`${url}model`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to list Fish Audio voices: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!Array.isArray(data)) {
    return []
  }

  return data.map((model: any) => ({
    id: model._id || model.id,
    title: model.title || model.name || model._id || model.id,
    description: model.description || '',
    tags: model.tags || [],
    author: model.author ? {
      id: model.author._id || model.author.id,
      name: model.author.name || model.author.username || '',
      avatar_url: model.author.avatar_url || model.author.avatarUrl,
    } : undefined,
  }))
}