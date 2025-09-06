import OpenAI from 'openai'
import { VisionCaption } from './types'
import { saveKeyframe } from './blob'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function extractKeyframes(videoUrl: string, jobId: string, duration: number): Promise<VisionCaption[]> {
  try {
    // For now, we'll use a simple approach - extract frames at regular intervals
    // In a production environment, you might want to use ffmpeg or similar tools
    const frameCount = Math.min(12, Math.floor(duration / 5000)) // One frame every 5 seconds, max 12
    const frameInterval = duration / frameCount
    
    const keyframes: VisionCaption[] = []
    
    // This is a simplified approach - in reality you'd need video processing
    // For YouTube videos, you could use thumbnail URLs at different timestamps
    // For other videos, you'd need proper video frame extraction
    
    for (let i = 0; i < frameCount; i++) {
      const timestamp = i * frameInterval
      
      try {
        // Create a placeholder for frame extraction
        // In a real implementation, you'd extract actual frames from the video
        const frameData = await createPlaceholderFrame(videoUrl, timestamp)
        const frameUrl = await saveKeyframe(jobId, i, frameData)
        
        keyframes.push({
          timestamp: Math.floor(timestamp),
          imageBlobUrl: frameUrl,
          caption: '',
          objects: [],
          labels: []
        })
      } catch (error) {
        console.error(`Failed to extract frame at ${timestamp}ms:`, error)
      }
    }
    
    return keyframes
  } catch (error) {
    console.error('Keyframe extraction error:', error)
    throw error
  }
}

async function createPlaceholderFrame(videoUrl: string, timestamp: number): Promise<Buffer> {
  // For now, skip keyframe extraction and just return empty buffer
  // In a real implementation, you'd use ffmpeg or similar to extract actual frames
  // For demonstration, we'll create a simple text-based placeholder
  const placeholder = `Keyframe at ${Math.floor(timestamp/1000)}s from ${videoUrl}`
  return Buffer.from(placeholder, 'utf-8')
}

export async function analyzeImage(imageUrl: string): Promise<{
  caption: string
  objects: string[]
  labels: string[]
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and provide a detailed description. Focus on: 1) What you see in the image, 2) Any text or writing visible, 3) Whether this appears to be a presentation slide, screen capture, chart, diagram, or regular video frame. Be specific and factual.'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    const caption = response.choices[0]?.message?.content || 'Unable to analyze image'
    
    const objects = extractObjects(caption)
    const labels = extractLabels(caption)
    
    return {
      caption: caption.trim(),
      objects,
      labels
    }
  } catch (error) {
    console.error('Image analysis error:', error)
    return {
      caption: 'Unable to analyze image',
      objects: [],
      labels: []
    }
  }
}

export async function analyzeImagesWithVision(captions: VisionCaption[]): Promise<VisionCaption[]> {
  const results = await Promise.allSettled(
    captions.map(async (caption) => {
      const analysis = await analyzeImage(caption.imageBlobUrl)
      return {
        ...caption,
        caption: analysis.caption,
        objects: analysis.objects || [],
        labels: analysis.labels || [],
        ocrText: extractTextFromCaption(analysis.caption) // GPT-4V can read text directly
      }
    })
  )
  
  return results
    .filter((result): result is PromiseFulfilledResult<VisionCaption> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value)
}

export async function extractOCRFromImage(imageUrl: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text visible in this image. Return only the text content, preserving line breaks and formatting where possible. If there is no text, return an empty string.'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 1000
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('OCR extraction error:', error)
    return ''
  }
}

function extractObjects(caption: string): string[] {
  const objectKeywords = [
    'person', 'people', 'man', 'woman', 'chart', 'graph', 'table', 'slide', 
    'screen', 'computer', 'phone', 'car', 'building', 'text', 'logo', 'button',
    'diagram', 'presentation', 'whiteboard', 'blackboard'
  ]
  
  return objectKeywords.filter(keyword => 
    caption.toLowerCase().includes(keyword.toLowerCase())
  )
}

function extractLabels(caption: string): string[] {
  const labels: string[] = []
  
  if (caption.toLowerCase().includes('slide') || caption.toLowerCase().includes('presentation')) {
    labels.push('presentation')
  }
  if (caption.toLowerCase().includes('screen') || caption.toLowerCase().includes('computer')) {
    labels.push('screen-capture')
  }
  if (caption.toLowerCase().includes('chart') || caption.toLowerCase().includes('graph')) {
    labels.push('data-visualization')
  }
  if (caption.toLowerCase().includes('text') || caption.toLowerCase().includes('writing')) {
    labels.push('text-heavy')
  }
  if (caption.toLowerCase().includes('diagram') || caption.toLowerCase().includes('flowchart')) {
    labels.push('diagram')
  }
  
  return labels
}

function extractTextFromCaption(caption: string): string {
  // Extract quoted text or text that appears to be OCR content
  const textMatches = caption.match(/"([^"]*)"/g)
  if (textMatches) {
    return textMatches.map(match => match.replace(/"/g, '')).join(' ')
  }
  
  // Look for common patterns that indicate text content
  const patterns = [
    /text[^.]*?(?:\.|$)/gi,
    /says[^.]*?(?:\.|$)/gi,
    /reads[^.]*?(?:\.|$)/gi,
    /titled[^.]*?(?:\.|$)/gi
  ]
  
  for (const pattern of patterns) {
    const matches = caption.match(pattern)
    if (matches) {
      return matches.join(' ').replace(/^(text|says|reads|titled)\s*/gi, '')
    }
  }
  
  return ''
}