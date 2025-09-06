export type JobStatus = 'queued' | 'processing' | 'summarizing' | 'done' | 'error'

export interface TranscriptSegment {
  start: number // ms
  end: number   // ms
  text: string
  speaker?: string
}

export interface VisionCaption {
  timestamp: number // ms (keyframe time)
  imageBlobUrl: string // Vercel Blob URL
  caption: string
  objects?: string[]
  labels?: string[]
  ocrText?: string
}

export interface Chapter {
  title: string
  start: number
  end: number
  bullets: string[]
}

export interface VisualMoment {
  timestamp: number
  title: string
  description: string
  frameUrl?: string
}

export interface QAItem {
  question: string
  answer: string
  timestamp?: number
}

export interface GlossaryItem {
  term: string
  explanation: string
}

export interface Summary {
  jobId: string
  tldr: string
  key_points: string[]
  chapters: Chapter[]
  action_items: string[]
  glossary?: GlossaryItem[]
  qa: QAItem[]
  visual_moments: VisualMoment[]
  sources: {
    transcriptProvider: string
    visionProvider: string
    ocrProvider?: string
    llm: "Claude"
  }
}

export interface Job {
  id: string
  status: JobStatus
  url: string
  createdAt: number
  updatedAt: number
  progress?: number
  error?: string
  summary?: Summary
  duration?: number // video duration in ms
  language?: string
}

export interface ProcessingStep {
  step: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  startTime?: number
  endTime?: number
  error?: string
}

export interface JobProgress {
  jobId: string
  status: JobStatus
  progress: number
  currentStep?: string
  steps: ProcessingStep[]
  estimatedTimeRemaining?: number
}

export interface IngestRequest {
  url: string
}

export interface IngestResponse {
  jobId: string
  status: JobStatus
}

export interface StatusResponse extends JobProgress {}

export interface SummaryResponse {
  summary: Summary | null
  error?: string
}