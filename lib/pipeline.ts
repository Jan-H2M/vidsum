import { QueueMessage, enqueueKeyframeExtraction, enqueueVisionAnalysis, enqueueSummarization, scheduleRetry } from './queue'
import { getJobData, saveJobData, saveTranscript, saveVisionCaptions, saveSummary, getTranscript, getVisionCaptions } from './blob'
import { transcribeVideo, getYouTubeTranscript, extractAudioUrl } from './stt'
import { extractKeyframes, analyzeImagesWithVision, extractOCRFromImage } from './vision'
import { generateSummary } from './llm'
import { isYouTubeUrl } from './utils'
import { Job, TranscriptSegment, VisionCaption } from './types'

const MAX_RETRIES = 3
const RETRY_DELAYS = [30, 120, 300] // seconds

export async function processVideoStep(message: QueueMessage): Promise<void> {
  const { jobId, step, url, retryCount = 0 } = message

  try {
    const job = await getJobData(jobId)
    if (!job) {
      console.error(`Job ${jobId} not found`)
      return
    }

    if (job.status === 'error') {
      console.log(`Job ${jobId} already in error state, skipping`)
      return
    }

    switch (step) {
      case 'transcription':
        await processTranscription(job, url!)
        break
      case 'keyframes':
        await processKeyframes(job, url!)
        break
      case 'vision':
        await processVisionAnalysis(job)
        break
      case 'summarization':
        await processSummarization(job)
        break
      default:
        throw new Error(`Unknown step: ${step}`)
    }
  } catch (error) {
    console.error(`Error in step ${step} for job ${jobId}:`, error)
    
    if (retryCount < MAX_RETRIES) {
      const delaySeconds = RETRY_DELAYS[retryCount] || 300
      console.log(`Scheduling retry ${retryCount + 1} for job ${jobId} in ${delaySeconds}s`)
      await scheduleRetry(message, delaySeconds)
    } else {
      await markJobAsError(jobId, `Failed in step ${step}: ${error}`)
    }
  }
}

async function processTranscription(job: Job, url: string): Promise<void> {
  console.log(`Starting transcription for job ${job.id}`)
  
  await updateJobStatus(job.id, 'processing')

  let transcript: TranscriptSegment[]
  let language = 'en'
  let duration = 0

  if (isYouTubeUrl(url)) {
    const existingTranscript = await getYouTubeTranscript(url)
    
    if (existingTranscript && existingTranscript.length > 0) {
      transcript = existingTranscript
      duration = Math.max(...transcript.map(t => t.end))
      console.log(`Using existing YouTube transcript for job ${job.id}`)
    } else {
      console.log(`No existing YouTube transcript, using STT for job ${job.id}`)
      const audioUrl = await extractAudioUrl(url)
      const result = await transcribeVideo(audioUrl)
      transcript = result.segments
      language = result.language
      duration = result.duration * 1000 // convert to ms
    }
  } else {
    const result = await transcribeVideo(url)
    transcript = result.segments
    language = result.language
    duration = result.duration * 1000 // convert to ms
  }

  await saveTranscript(job.id, transcript)
  
  const updatedJob: Job = {
    ...job,
    duration,
    language,
    updatedAt: Date.now()
  }
  await saveJobData(job.id, updatedJob)

  console.log(`Transcription complete for job ${job.id}, enqueueing keyframes`)
  await enqueueKeyframeExtraction(job.id, url)
}

async function processKeyframes(job: Job, url: string): Promise<void> {
  console.log(`Starting keyframe extraction for job ${job.id}`)

  if (!job.duration) {
    throw new Error('Job duration not available')
  }

  const keyframes = await extractKeyframes(url, job.id, job.duration)
  
  if (keyframes.length === 0) {
    throw new Error('No keyframes extracted')
  }

  await saveVisionCaptions(job.id, keyframes)
  
  console.log(`Keyframes extracted for job ${job.id}, enqueueing vision analysis`)
  await enqueueVisionAnalysis(job.id)
}

async function processVisionAnalysis(job: Job): Promise<void> {
  console.log(`Starting vision analysis for job ${job.id}`)

  const keyframes = await getVisionCaptions(job.id)
  if (!keyframes) {
    throw new Error('Keyframes not found')
  }

  const analyzedFrames = await analyzeImagesWithVision(keyframes)
  
  const framesWithOCR = await Promise.allSettled(
    analyzedFrames.map(async (frame) => {
      if (frame.labels?.includes('text-heavy') || frame.labels?.includes('presentation')) {
        const ocrText = await extractOCRFromImage(frame.imageBlobUrl)
        return { ...frame, ocrText }
      }
      return frame
    })
  )

  const finalFrames = framesWithOCR
    .filter((result): result is PromiseFulfilledResult<VisionCaption> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value)

  await saveVisionCaptions(job.id, finalFrames)
  
  console.log(`Vision analysis complete for job ${job.id}, enqueueing summarization`)
  await enqueueSummarization(job.id)
}

async function processSummarization(job: Job): Promise<void> {
  console.log(`Starting summarization for job ${job.id}`)
  
  await updateJobStatus(job.id, 'summarizing')

  const transcript = await getTranscript(job.id)
  const visionCaptions = await getVisionCaptions(job.id)

  if (!transcript) {
    throw new Error('Transcript not found')
  }

  if (!visionCaptions) {
    throw new Error('Vision captions not found')
  }

  if (!job.duration || !job.language) {
    throw new Error('Job duration or language not available')
  }

  const summary = await generateSummary(
    job.id,
    transcript,
    visionCaptions,
    job.duration,
    job.language
  )

  await saveSummary(job.id, summary)
  
  await updateJobStatus(job.id, 'done')
  console.log(`Summarization complete for job ${job.id}`)
}

async function updateJobStatus(jobId: string, status: Job['status']): Promise<void> {
  const job = await getJobData(jobId)
  if (!job) return

  const updatedJob: Job = {
    ...job,
    status,
    updatedAt: Date.now()
  }

  await saveJobData(jobId, updatedJob)
}

async function markJobAsError(jobId: string, error: string): Promise<void> {
  const job = await getJobData(jobId)
  if (!job) return

  const updatedJob: Job = {
    ...job,
    status: 'error',
    error,
    updatedAt: Date.now()
  }

  await saveJobData(jobId, updatedJob)
}