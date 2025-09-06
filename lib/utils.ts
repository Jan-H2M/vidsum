import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export function formatTimestamp(ms: number): string {
  return formatDuration(ms)
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

export function isYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
  return youtubeRegex.test(url)
}

export function generateJobId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function createYouTubeTimestampUrl(originalUrl: string, timestampMs: number): string {
  try {
    const url = new URL(originalUrl)
    const timestampSeconds = Math.floor(timestampMs / 1000)
    
    if (url.hostname.includes('youtu.be')) {
      url.searchParams.set('t', timestampSeconds.toString())
    } else if (url.hostname.includes('youtube.com')) {
      url.searchParams.set('t', timestampSeconds.toString())
    }
    
    return url.toString()
  } catch {
    return originalUrl
  }
}