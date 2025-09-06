import Replicate from 'replicate'
import { VisionCaption } from './types'
import { saveKeyframe } from './blob'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export async function extractKeyframes(videoUrl: string, jobId: string, duration: number): Promise<VisionCaption[]> {
  try {
    const frameCount = Math.min(24, Math.floor(duration / 2500))
    const frameInterval = duration / frameCount
    
    const keyframes: VisionCaption[] = []
    
    for (let i = 0; i < frameCount; i++) {
      const timestamp = i * frameInterval
      
      try {
        const frame = await extractFrameAtTimestamp(videoUrl, timestamp)
        const frameUrl = await saveKeyframe(jobId, i, frame)
        
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

export async function extractFrameAtTimestamp(videoUrl: string, timestampMs: number): Promise<Buffer> {
  try {
    const timestampSeconds = timestampMs / 1000
    
    const output = await replicate.run(
      "pollinations/modnet-image-segmentation:f00b7fa2b9b8d8d1e0b6f23b5c9fe9c5a91b7b2b9b8d8d1e0b6f23b5c9fe9c5",
      {
        input: {
          video_url: videoUrl,
          timestamp: timestampSeconds
        }
      }
    ) as string
    
    const response = await fetch(output)
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  } catch (error) {
    console.error('Frame extraction error:', error)
    throw error
  }
}

export async function analyzeImage(imageUrl: string): Promise<{
  caption: string
  objects: string[]
  labels: string[]
}> {
  try {
    const output = await replicate.run(
      "yorickvp/llava-13b:b5f6212d032508382d61ff00469ddda3e32fd8a0e75dc39d8a4191bb742157fb",
      {
        input: {
          image: imageUrl,
          prompt: "Describe this image in detail. What objects, text, or visual elements do you see? If this looks like a presentation slide or screen capture, mention that specifically."
        }
      }
    ) as string

    const caption = Array.isArray(output) ? output.join('') : output
    
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
        objects: analysis.objects,
        labels: analysis.labels
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
    const output = await replicate.run(
      "abiruyt/text-extract-ocr:a524caeaa23495bc9edc2f0bf3b90ba2e11da5e5e14739321d4db8c8a3b80a9a",
      {
        input: {
          image: imageUrl
        }
      }
    ) as string

    return Array.isArray(output) ? output.join('') : output || ''
  } catch (error) {
    console.error('OCR extraction error:', error)
    return ''
  }
}

function extractObjects(caption: string): string[] {
  const objectKeywords = [
    'person', 'people', 'man', 'woman', 'chart', 'graph', 'table', 'slide', 
    'screen', 'computer', 'phone', 'car', 'building', 'text', 'logo', 'button'
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
  
  return labels
}