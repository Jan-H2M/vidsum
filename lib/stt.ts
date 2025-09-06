import OpenAI from 'openai'
import { TranscriptSegment } from './types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function transcribeVideo(audioUrl: string): Promise<{
  segments: TranscriptSegment[]
  language: string
  duration: number
}> {
  try {
    // Download the audio file first
    const response = await fetch(audioUrl)
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`)
    }
    
    const audioBuffer = await response.arrayBuffer()
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    })

    if (!transcription.words) {
      throw new Error('No word-level timestamps received from Whisper')
    }

    const segments: TranscriptSegment[] = transcription.words.map(word => ({
      start: (word.start || 0) * 1000, // convert to ms
      end: (word.end || 0) * 1000,    // convert to ms
      text: word.word || '',
    }))

    const mergedSegments = mergeSegmentsByPause(segments)

    return {
      segments: mergedSegments,
      language: transcription.language || 'en',
      duration: transcription.duration || 0
    }
  } catch (error) {
    console.error('Whisper transcription error:', error)
    throw new Error(`Transcription failed: ${error}`)
  }
}

function mergeSegmentsByPause(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (segments.length === 0) return []
  
  const merged: TranscriptSegment[] = []
  let currentSegment = { ...segments[0] }
  
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i]
    
    // Merge if pause is less than 2 seconds
    if ((segment.start - currentSegment.end) < 2000) {
      currentSegment.text += ' ' + segment.text
      currentSegment.end = segment.end
    } else {
      merged.push(currentSegment)
      currentSegment = { ...segment }
    }
  }
  
  merged.push(currentSegment)
  return merged
}

export async function getYouTubeTranscript(videoUrl: string): Promise<TranscriptSegment[] | null> {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript')
    
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoUrl)
    
    return transcriptItems.map(item => ({
      start: item.offset,
      end: item.offset + item.duration,
      text: item.text,
    }))
  } catch (error) {
    console.error('YouTube transcript error:', error)
    return null
  }
}

export async function extractAudioUrl(videoUrl: string): Promise<string> {
  try {
    const ytdl = await import('ytdl-core')
    
    if (!ytdl.default.validateURL(videoUrl)) {
      throw new Error('Invalid YouTube URL')
    }
    
    const info = await ytdl.default.getInfo(videoUrl)
    const audioFormats = ytdl.default.filterFormats(info.formats, 'audioonly')
    
    if (audioFormats.length === 0) {
      throw new Error('No audio format found')
    }
    
    return audioFormats[0].url
  } catch (error) {
    console.error('Audio extraction error:', error)
    throw error
  }
}

export async function transcribeFromFile(file: File): Promise<{
  segments: TranscriptSegment[]
  language: string
  duration: number
}> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    })

    if (!transcription.words) {
      throw new Error('No word-level timestamps received from Whisper')
    }

    const segments: TranscriptSegment[] = transcription.words.map(word => ({
      start: (word.start || 0) * 1000, // convert to ms
      end: (word.end || 0) * 1000,    // convert to ms
      text: word.word || '',
    }))

    const mergedSegments = mergeSegmentsByPause(segments)

    return {
      segments: mergedSegments,
      language: transcription.language || 'en',
      duration: transcription.duration || 0
    }
  } catch (error) {
    console.error('File transcription error:', error)
    throw new Error(`File transcription failed: ${error}`)
  }
}