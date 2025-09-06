export interface QueueMessage {
  jobId: string
  step: string
  url?: string
  retryCount?: number
}

// Simplified in-memory queue for development
// In production, you might want to use a persistent queue or database
const jobQueue: Map<string, QueueMessage[]> = new Map()

export async function enqueueJob(message: QueueMessage, delaySeconds = 0): Promise<string> {
  const messageId = `${message.jobId}-${message.step}-${Date.now()}`
  
  if (delaySeconds > 0) {
    // Schedule the job to run after delay
    setTimeout(() => {
      processQueueMessage(message)
    }, delaySeconds * 1000)
  } else {
    // Process immediately in the background
    setImmediate(() => {
      processQueueMessage(message)
    })
  }
  
  return messageId
}

export async function scheduleRetry(message: QueueMessage, delaySeconds: number): Promise<string> {
  const retryMessage = {
    ...message,
    retryCount: (message.retryCount || 0) + 1
  }
  
  return enqueueJob(retryMessage, delaySeconds)
}

export async function enqueueTranscription(jobId: string, url: string): Promise<string> {
  return enqueueJob({
    jobId,
    step: 'transcription',
    url
  })
}

export async function enqueueKeyframeExtraction(jobId: string, url: string): Promise<string> {
  return enqueueJob({
    jobId,
    step: 'keyframes',
    url
  })
}

export async function enqueueVisionAnalysis(jobId: string): Promise<string> {
  return enqueueJob({
    jobId,
    step: 'vision'
  })
}

export async function enqueueSummarization(jobId: string): Promise<string> {
  return enqueueJob({
    jobId,
    step: 'summarization'
  })
}

async function processQueueMessage(message: QueueMessage) {
  try {
    // Import the pipeline processor dynamically to avoid circular dependencies
    const { processVideoStep } = await import('./pipeline')
    await processVideoStep(message)
  } catch (error) {
    console.error('Queue processing error:', error)
  }
}

// For development/testing - not needed for Upstash signature verification
export function verifySignature(signature: string, signingKey: string, body: string): boolean {
  // In simplified version, we don't use external queue signatures
  return true
}