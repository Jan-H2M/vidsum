'use client'

import { useEffect, useState } from 'react'
import { JobProgress, ProcessingStep } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface JobStatusProps {
  jobId: string
  onComplete?: () => void
}

export function JobStatus({ jobId, onComplete }: JobStatusProps) {
  const [status, setStatus] = useState<JobProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status?jobId=${jobId}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to get status')
          return
        }

        setStatus(data)

        if (data.status === 'done') {
          onComplete?.()
        } else if (data.status === 'error') {
          setError('Processing failed')
        }
      } catch (err) {
        setError('Failed to check status')
        console.error('Status polling error:', err)
      }
    }

    pollStatus()
    const interval = setInterval(pollStatus, 3000)

    return () => clearInterval(interval)
  }, [jobId, onComplete])

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading status...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Processing Video</span>
          <StatusBadge status={status.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{status.currentStep}</span>
            <span>{status.progress}%</span>
          </div>
          <Progress value={status.progress} className="h-2" />
        </div>

        {status.estimatedTimeRemaining && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Estimated time remaining: {formatDuration(status.estimatedTimeRemaining)}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Processing Steps</h4>
          <div className="space-y-2">
            {status.steps.map((step, index) => (
              <ProcessingStepItem key={index} step={step} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const getVariant = () => {
    switch (status) {
      case 'done': return 'default'
      case 'error': return 'destructive'
      case 'processing':
      case 'summarizing': return 'secondary'
      default: return 'outline'
    }
  }

  const getLabel = () => {
    switch (status) {
      case 'queued': return 'Queued'
      case 'processing': return 'Processing'
      case 'summarizing': return 'Summarizing'
      case 'done': return 'Complete'
      case 'error': return 'Error'
      default: return status
    }
  }

  return <Badge variant={getVariant()}>{getLabel()}</Badge>
}

function ProcessingStepItem({ step }: { step: ProcessingStep }) {
  const getIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
    }
  }

  return (
    <div className="flex items-center gap-3 py-2">
      {getIcon()}
      <span className={`text-sm ${
        step.status === 'completed' ? 'text-green-700' :
        step.status === 'processing' ? 'text-blue-700' :
        step.status === 'error' ? 'text-red-700' :
        'text-muted-foreground'
      }`}>
        {step.step}
      </span>
    </div>
  )
}