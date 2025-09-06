import { put, del, list } from '@vercel/blob'
import { promises as fs } from 'fs'
import path from 'path'
import { Job, Summary, TranscriptSegment, VisionCaption } from './types'

// Use local storage for development, Vercel Blob for production, memory as fallback
const HAS_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN && 
  process.env.BLOB_READ_WRITE_TOKEN !== 'your_vercel_blob_token_here'

// Detect if we're in Vercel's serverless environment
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV

const USE_LOCAL_STORAGE = process.env.NODE_ENV !== 'production' && !IS_VERCEL

const USE_MEMORY_STORAGE = (process.env.NODE_ENV === 'production' || IS_VERCEL) && !HAS_BLOB_TOKEN

// In-memory storage for serverless fallback
const memoryStorage = new Map<string, any>()

const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.vidsum-storage')

async function ensureLocalDir() {
  if (USE_LOCAL_STORAGE) {
    try {
      await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true })
    } catch (error) {
      // If we can't create directories (read-only filesystem), we should use memory storage
      console.warn('Cannot create local storage directory, using memory storage:', error)
    }
  }
}

async function saveToLocal(filePath: string, data: string | Buffer): Promise<string> {
  await ensureLocalDir()
  const fullPath = path.join(LOCAL_STORAGE_DIR, filePath)
  const dir = path.dirname(fullPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(fullPath, data)
  return `file://${fullPath}` // Return file URL for consistency
}

async function readFromLocal(filePath: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(LOCAL_STORAGE_DIR, filePath)
    const data = await fs.readFile(fullPath)
    return data
  } catch {
    return null
  }
}

async function deleteFromLocal(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(LOCAL_STORAGE_DIR, filePath)
    await fs.unlink(fullPath)
  } catch {
    // Ignore errors if file doesn't exist
  }
}

// Memory storage functions for serverless fallback
async function saveToMemory(key: string, data: any): Promise<string> {
  memoryStorage.set(key, data)
  return `memory://${key}`
}

async function readFromMemory(key: string): Promise<any> {
  return memoryStorage.get(key) || null
}

async function deleteFromMemory(key: string): Promise<void> {
  memoryStorage.delete(key)
}

export async function saveJobData(jobId: string, job: Job): Promise<void> {
  const data = JSON.stringify(job)
  
  if (USE_LOCAL_STORAGE) {
    await saveToLocal(`jobs/${jobId}.json`, data)
  } else if (USE_MEMORY_STORAGE) {
    await saveToMemory(`jobs/${jobId}.json`, data)
  } else {
    await put(`jobs/${jobId}.json`, data, {
      access: 'public',
    })
  }
}

export async function getJobData(jobId: string): Promise<Job | null> {
  try {
    if (USE_LOCAL_STORAGE) {
      const data = await readFromLocal(`jobs/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data.toString())
    } else if (USE_MEMORY_STORAGE) {
      const data = await readFromMemory(`jobs/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data)
    } else {
      const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN}/jobs/${jobId}.json`)
      if (!response.ok) return null
      return await response.json()
    }
  } catch {
    return null
  }
}

export async function saveTranscript(jobId: string, segments: TranscriptSegment[]): Promise<string> {
  const data = JSON.stringify(segments)
  
  if (USE_LOCAL_STORAGE) {
    return await saveToLocal(`transcripts/${jobId}.json`, data)
  } else if (USE_MEMORY_STORAGE) {
    return await saveToMemory(`transcripts/${jobId}.json`, data)
  } else {
    const blob = await put(`transcripts/${jobId}.json`, data, {
      access: 'public',
    })
    return blob.url
  }
}

export async function getTranscript(jobId: string): Promise<TranscriptSegment[] | null> {
  try {
    if (USE_LOCAL_STORAGE) {
      const data = await readFromLocal(`transcripts/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data.toString())
    } else {
      const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN}/transcripts/${jobId}.json`)
      if (!response.ok) return null
      return await response.json()
    }
  } catch {
    return null
  }
}

export async function saveVisionCaptions(jobId: string, captions: VisionCaption[]): Promise<string> {
  const data = JSON.stringify(captions)
  
  if (USE_LOCAL_STORAGE) {
    return await saveToLocal(`vision/${jobId}.json`, data)
  } else {
    const blob = await put(`vision/${jobId}.json`, data, {
      access: 'public',
    })
    return blob.url
  }
}

export async function getVisionCaptions(jobId: string): Promise<VisionCaption[] | null> {
  try {
    if (USE_LOCAL_STORAGE) {
      const data = await readFromLocal(`vision/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data.toString())
    } else {
      const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN}/vision/${jobId}.json`)
      if (!response.ok) return null
      return await response.json()
    }
  } catch {
    return null
  }
}

export async function saveSummary(jobId: string, summary: Summary): Promise<string> {
  const data = JSON.stringify(summary)
  
  if (USE_LOCAL_STORAGE) {
    return await saveToLocal(`summaries/${jobId}.json`, data)
  } else {
    const blob = await put(`summaries/${jobId}.json`, data, {
      access: 'public',
    })
    return blob.url
  }
}

export async function getSummary(jobId: string): Promise<Summary | null> {
  try {
    if (USE_LOCAL_STORAGE) {
      const data = await readFromLocal(`summaries/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data.toString())
    } else {
      const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN}/summaries/${jobId}.json`)
      if (!response.ok) return null
      return await response.json()
    }
  } catch {
    return null
  }
}

export async function saveKeyframe(jobId: string, frameIndex: number, frameBuffer: Buffer): Promise<string> {
  if (USE_LOCAL_STORAGE) {
    const filePath = `keyframes/${jobId}-${frameIndex}.jpg`
    await saveToLocal(filePath, frameBuffer)
    // Return a data URL for local access
    const base64 = frameBuffer.toString('base64')
    return `data:image/jpeg;base64,${base64}`
  } else {
    const blob = await put(`keyframes/${jobId}-${frameIndex}.jpg`, frameBuffer, {
      access: 'public',
    })
    return blob.url
  }
}

export async function cleanupJobFiles(jobId: string): Promise<void> {
  try {
    if (USE_LOCAL_STORAGE) {
      // Clean up local files
      const patterns = [
        `jobs/${jobId}.json`,
        `transcripts/${jobId}.json`,
        `vision/${jobId}.json`,
        `summaries/${jobId}.json`
      ]
      
      await Promise.all(patterns.map(pattern => deleteFromLocal(pattern)))
      
      // Clean up keyframes
      for (let i = 0; i < 24; i++) {
        await deleteFromLocal(`keyframes/${jobId}-${i}.jpg`)
      }
    } else {
      const { blobs } = await list({ prefix: jobId })
      await Promise.all(blobs.map(blob => del(blob.url)))
    }
  } catch (error) {
    console.error('Failed to cleanup job files:', error)
  }
}