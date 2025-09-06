import { put, del, list, head } from '@vercel/blob'
import { promises as fs } from 'fs'
import path from 'path'
import { Job, Summary, TranscriptSegment, VisionCaption } from './types'


// In-memory storage for serverless fallback
const memoryStorage = new Map<string, any>()

// Storage mode cache
let storageMode: 'local' | 'memory' | 'blob' | null = null
let filesystemTestAttempted = false

async function canUseFilesystem(): Promise<boolean> {
  if (filesystemTestAttempted) {
    return storageMode === 'local'
  }
  
  try {
    const testDir = path.join(process.cwd(), '.test-write-access')
    const testFile = path.join(testDir, 'test.txt')
    
    await fs.mkdir(testDir, { recursive: true })
    await fs.writeFile(testFile, 'test')
    await fs.unlink(testFile)
    await fs.rmdir(testDir)
    
    return true
  } catch (error) {
    return false
  } finally {
    filesystemTestAttempted = true
  }
}

function getStorageMode(): 'local' | 'memory' | 'blob' {
  if (process.env.NODE_ENV === 'production') {
    const hasBlob = process.env.BLOB_READ_WRITE_TOKEN && 
      process.env.BLOB_READ_WRITE_TOKEN !== 'your_vercel_blob_token_here'
    
    return hasBlob ? 'blob' : 'memory'
  }

  if (storageMode) return storageMode

  const hasBlob = process.env.BLOB_READ_WRITE_TOKEN && 
    process.env.BLOB_READ_WRITE_TOKEN !== 'your_vercel_blob_token_here'
    
  // Detect ANY serverless environment
  const cwd = process.cwd()
  
  const isServerless = !!(
    cwd.includes('/var/') ||                          // ANY /var path (serverless)
    cwd.includes('lambda') ||                         // Lambda in path
    cwd.includes('serverless') ||                     // Serverless in path
    process.env.LAMBDA_TASK_ROOT ||                   
    process.env.LAMBDA_RUNTIME_DIR ||                 
    process.env.AWS_REGION ||                         
    process.env.AWS_LAMBDA_FUNCTION_NAME ||          
    process.env.VERCEL === '1' ||                     
    process.env.VERCEL_ENV ||                         
    process.env.NETLIFY ||                            
    process.env.RAILWAY_ENVIRONMENT ||               
    process.env.RENDER
  )
  
  
  if (hasBlob) {
    storageMode = 'blob'
  } else if (isServerless) {
    storageMode = 'memory'
  } else {
    storageMode = 'memory'
  }
  
  return storageMode
}

function getLocalStorageDir(): string {
  return path.join(process.cwd(), '.vidsum-storage')
}

async function ensureLocalDir(localDir: string) {
  try {
    await fs.mkdir(localDir, { recursive: true })
  } catch (error) {
    // If we can't create directories (read-only filesystem), fallback to memory
    console.warn('Cannot create local storage directory, switching to memory storage:', error)
    storageMode = 'memory'
    throw error
  }
}

async function saveToLocal(filePath: string, data: string | Buffer): Promise<string> {
  const localDir = getLocalStorageDir()
  await ensureLocalDir(localDir)
  const fullPath = path.join(localDir, filePath)
  const dir = path.dirname(fullPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(fullPath, data)
  return `file://${fullPath}` // Return file URL for consistency
}

async function readFromLocal(filePath: string): Promise<Buffer | null> {
  try {
    const localDir = getLocalStorageDir()
    const fullPath = path.join(localDir, filePath)
    const data = await fs.readFile(fullPath)
    return data
  } catch {
    return null
  }
}

async function deleteFromLocal(filePath: string): Promise<void> {
  try {
    const localDir = getLocalStorageDir()
    const fullPath = path.join(localDir, filePath)
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
  const mode = getStorageMode()
  
  try {
    if (mode === 'blob') {
      await put(`jobs/${jobId}.json`, data, {
        access: 'public',
        addRandomSuffix: false,
      })
    } else if (mode === 'local') {
      await saveToLocal(`jobs/${jobId}.json`, data)
    } else {
      await saveToMemory(`jobs/${jobId}.json`, data)
    }
  } catch (error) {
    console.error(`${mode} storage failed for job ${jobId}:`, error)
    storageMode = 'memory'
    await saveToMemory(`jobs/${jobId}.json`, data)
  }
}

export async function getJobData(jobId: string): Promise<Job | null> {
  try {
    const mode = getStorageMode()
    
    if (mode === 'blob') {
      try {
        const { blobs } = await list()
        const targetPath = `jobs/${jobId}.json`
        const jobBlob = blobs.find(b => b.pathname === targetPath)
        
        if (!jobBlob) {
          return null
        }
        
        console.log('Fetching blob URL:', jobBlob.url)
        const response = await fetch(jobBlob.url)
        console.log('Blob fetch response status:', response.status)
        if (!response.ok) {
          console.log('Blob fetch failed with status:', response.status, await response.text())
          return null
        }
        
        return await response.json()
      } catch (blobError) {
        console.warn('Blob retrieval error:', blobError)
        return null
      }
    } else if (mode === 'local') {
      const data = await readFromLocal(`jobs/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data.toString())
    } else {
      const data = await readFromMemory(`jobs/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data)
    }
  } catch (error) {
    console.warn('Failed to get job data:', error)
    return null
  }
}

export async function saveTranscript(jobId: string, segments: TranscriptSegment[]): Promise<string> {
  const data = JSON.stringify(segments)
  const mode = getStorageMode()
  
  try {
    if (mode === 'local') {
      return await saveToLocal(`transcripts/${jobId}.json`, data)
    } else if (mode === 'memory') {
      return await saveToMemory(`transcripts/${jobId}.json`, data)
    } else {
      const blob = await put(`transcripts/${jobId}.json`, data, {
        access: 'public',
      })
      return blob.url
    }
  } catch (error) {
    if (mode === 'local') {
      console.warn('Local storage failed, falling back to memory:', error)
      storageMode = 'memory'
      return await saveToMemory(`transcripts/${jobId}.json`, data)
    } else {
      throw error
    }
  }
}

export async function getTranscript(jobId: string): Promise<TranscriptSegment[] | null> {
  try {
    const mode = getStorageMode()
    
    if (mode === 'local') {
      const data = await readFromLocal(`transcripts/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data.toString())
    } else if (mode === 'memory') {
      const data = await readFromMemory(`transcripts/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data)
    } else {
      // Use proper blob API
      const { blobs } = await list()
      const targetPath = `transcripts/${jobId}.json`
      const blob = blobs.find(b => b.pathname === targetPath)
      if (!blob) return null
      const response = await fetch(blob.url)
      if (!response.ok) return null
      return await response.json()
    }
  } catch (error) {
    console.warn('Failed to get transcript:', error)
    return null
  }
}

export async function saveVisionCaptions(jobId: string, captions: VisionCaption[]): Promise<string> {
  const data = JSON.stringify(captions)
  const mode = getStorageMode()
  
  try {
    if (mode === 'local') {
      return await saveToLocal(`vision/${jobId}.json`, data)
    } else if (mode === 'memory') {
      return await saveToMemory(`vision/${jobId}.json`, data)
    } else {
      const blob = await put(`vision/${jobId}.json`, data, {
        access: 'public',
      })
      return blob.url
    }
  } catch (error) {
    if (mode === 'local') {
      console.warn('Local storage failed, falling back to memory:', error)
      storageMode = 'memory'
      return await saveToMemory(`vision/${jobId}.json`, data)
    } else {
      throw error
    }
  }
}

export async function getVisionCaptions(jobId: string): Promise<VisionCaption[] | null> {
  try {
    const mode = getStorageMode()
    
    if (mode === 'local') {
      const data = await readFromLocal(`vision/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data.toString())
    } else if (mode === 'memory') {
      const data = await readFromMemory(`vision/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data)
    } else {
      // Use proper blob API
      const { blobs } = await list()
      const targetPath = `vision/${jobId}.json`
      const blob = blobs.find(b => b.pathname === targetPath)
      if (!blob) return null
      const response = await fetch(blob.url)
      if (!response.ok) return null
      return await response.json()
    }
  } catch (error) {
    console.warn('Failed to get vision captions:', error)
    return null
  }
}

export async function saveSummary(jobId: string, summary: Summary): Promise<string> {
  const data = JSON.stringify(summary)
  const mode = getStorageMode()
  
  try {
    if (mode === 'local') {
      return await saveToLocal(`summaries/${jobId}.json`, data)
    } else if (mode === 'memory') {
      return await saveToMemory(`summaries/${jobId}.json`, data)
    } else {
      const blob = await put(`summaries/${jobId}.json`, data, {
        access: 'public',
      })
      return blob.url
    }
  } catch (error) {
    if (mode === 'local') {
      console.warn('Local storage failed, falling back to memory:', error)
      storageMode = 'memory'
      return await saveToMemory(`summaries/${jobId}.json`, data)
    } else {
      throw error
    }
  }
}

export async function getSummary(jobId: string): Promise<Summary | null> {
  try {
    const mode = getStorageMode()
    
    if (mode === 'local') {
      const data = await readFromLocal(`summaries/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data.toString())
    } else if (mode === 'memory') {
      const data = await readFromMemory(`summaries/${jobId}.json`)
      if (!data) return null
      return JSON.parse(data)
    } else {
      // Use proper blob API
      const { blobs } = await list()
      const targetPath = `summaries/${jobId}.json`
      const blob = blobs.find(b => b.pathname === targetPath)
      if (!blob) return null
      const response = await fetch(blob.url)
      if (!response.ok) return null
      return await response.json()
    }
  } catch (error) {
    console.warn('Failed to get summary:', error)
    return null
  }
}

export async function saveKeyframe(jobId: string, frameIndex: number, frameBuffer: Buffer): Promise<string> {
  const mode = getStorageMode()
  
  try {
    if (mode === 'local') {
      const filePath = `keyframes/${jobId}-${frameIndex}.jpg`
      await saveToLocal(filePath, frameBuffer)
      // Return a data URL for local access
      const base64 = frameBuffer.toString('base64')
      return `data:image/jpeg;base64,${base64}`
    } else if (mode === 'memory') {
      const filePath = `keyframes/${jobId}-${frameIndex}.jpg`
      const base64 = frameBuffer.toString('base64')
      await saveToMemory(filePath, base64)
      return `data:image/jpeg;base64,${base64}`
    } else {
      const blob = await put(`keyframes/${jobId}-${frameIndex}.jpg`, frameBuffer, {
        access: 'public',
      })
      return blob.url
    }
  } catch (error) {
    if (mode === 'local') {
      console.warn('Local storage failed, falling back to memory:', error)
      storageMode = 'memory'
      const filePath = `keyframes/${jobId}-${frameIndex}.jpg`
      const base64 = frameBuffer.toString('base64')
      await saveToMemory(filePath, base64)
      return `data:image/jpeg;base64,${base64}`
    } else {
      throw error
    }
  }
}

export async function cleanupJobFiles(jobId: string): Promise<void> {
  try {
    const mode = getStorageMode()
    
    if (mode === 'local') {
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
    } else if (mode === 'memory') {
      // Clean up memory storage
      const patterns = [
        `jobs/${jobId}.json`,
        `transcripts/${jobId}.json`,
        `vision/${jobId}.json`,
        `summaries/${jobId}.json`
      ]
      
      await Promise.all(patterns.map(pattern => deleteFromMemory(pattern)))
      
      // Clean up keyframes
      for (let i = 0; i < 24; i++) {
        await deleteFromMemory(`keyframes/${jobId}-${i}.jpg`)
      }
    } else {
      const { blobs } = await list({ prefix: jobId })
      await Promise.all(blobs.map(blob => del(blob.url)))
    }
  } catch (error) {
    console.error('Failed to cleanup job files:', error)
  }
}