'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { JobStatus } from '@/components/JobStatus'
import { SummaryView } from '@/components/SummaryView'
import { Summary } from '@/lib/types'
import { isValidUrl } from '@/lib/utils'
import { Video, Sparkles, Eye, MessageSquare, FileText } from 'lucide-react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url || !isValidUrl(url)) {
      setError('Please enter a valid URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setSummary(null)

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video')
      }

      setJobId(data.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  const handleJobComplete = async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/api/summary?jobId=${jobId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get summary')
      }

      setSummary(data.summary)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary')
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setUrl('')
    setJobId(null)
    setSummary(null)
    setIsLoading(false)
    setError(null)
  }

  if (summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
        <div className="container mx-auto">
          <div className="mb-6 text-center">
            <Button variant="outline" onClick={handleReset}>
              ← Analyze Another Video
            </Button>
          </div>
          <SummaryView summary={summary} originalUrl={url} />
        </div>
      </div>
    )
  }

  if (jobId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
        <div className="container mx-auto">
          <div className="mb-6 text-center">
            <Button variant="outline" onClick={handleReset}>
              ← Start Over
            </Button>
          </div>
          <JobStatus jobId={jobId} onComplete={handleJobComplete} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Video className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">VidSum</h1>
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </div>
            <p className="text-xl text-muted-foreground mb-2">
              AI-Powered Video Analysis & Summarization
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Transform any video into a comprehensive summary with transcription, visual analysis, 
              chapters, key points, and actionable insights. We sprokkelen frames… geen popcorn nodig 🍿
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Analyze Your Video</CardTitle>
              <CardDescription>
                Enter a video URL (YouTube, MP4, or any public video link) to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://youtube.com/watch?v=... or https://example.com/video.mp4"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={isLoading || !url}>
                    {isLoading ? 'Processing...' : 'Analyze Video'}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Transcription</h3>
                <p className="text-sm text-muted-foreground">
                  Smart transcript with timestamps and speaker detection
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Eye className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Visual Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Keyframe extraction with AI-powered scene detection
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Smart Summary</h3>
                <p className="text-sm text-muted-foreground">
                  TL;DR, chapters, action items, and Q&A generation
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">AI-Powered</h3>
                <p className="text-sm text-muted-foreground">
                  Powered by Claude, AssemblyAI, and Replicate
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Supported Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="outline">YouTube</Badge>
                <Badge variant="outline">MP4</Badge>
                <Badge variant="outline">MOV</Badge>
                <Badge variant="outline">AVI</Badge>
                <Badge variant="outline">Public Video URLs</Badge>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Processing typically takes 3-5 minutes depending on video length
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}