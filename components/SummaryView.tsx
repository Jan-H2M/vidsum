'use client'

import { Summary } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Eye, 
  FileText, 
  HelpCircle, 
  BookOpen, 
  CheckSquare, 
  Share2,
  Download,
  ExternalLink
} from 'lucide-react'
import { formatTimestamp, createYouTubeTimestampUrl, isYouTubeUrl } from '@/lib/utils'
import Image from 'next/image'

interface SummaryViewProps {
  summary: Summary
  originalUrl?: string
}

export function SummaryView({ summary, originalUrl }: SummaryViewProps) {
  const handleTimestampClick = (timestampMs: number) => {
    if (originalUrl && isYouTubeUrl(originalUrl)) {
      const urlWithTimestamp = createYouTubeTimestampUrl(originalUrl, timestampMs)
      window.open(urlWithTimestamp, '_blank')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Video Summary',
          text: summary.tldr,
          url: window.location.href
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const handleExport = () => {
    const markdown = generateMarkdown(summary)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `video-summary-${summary.jobId}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Video Summary</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">TL;DR</h3>
              <p className="text-muted-foreground leading-relaxed">{summary.tldr}</p>
            </div>
            
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">
                <FileText className="h-3 w-3 mr-1" />
                {summary.sources.transcriptProvider}
              </Badge>
              <Badge variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                {summary.sources.visionProvider}
              </Badge>
              <Badge variant="outline">
                <BookOpen className="h-3 w-3 mr-1" />
                {summary.sources.llm}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["key-points"]} className="space-y-4">
        <AccordionItem value="key-points">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                <span className="font-semibold">Key Points ({summary.key_points.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {summary.key_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="chapters">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span className="font-semibold">Chapters ({summary.chapters.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0 space-y-4">
                {summary.chapters.map((chapter, index) => (
                  <div key={index} className="border-l-2 border-primary/20 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{chapter.title}</h4>
                      <TimestampButton 
                        timestamp={chapter.start}
                        onClick={() => handleTimestampClick(chapter.start)}
                        disabled={!originalUrl || !isYouTubeUrl(originalUrl)}
                      />
                      {chapter.end !== chapter.start && (
                        <span className="text-xs text-muted-foreground">
                          - {formatTimestamp(chapter.end)}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {chapter.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {summary.action_items.length > 0 && (
          <AccordionItem value="actions">
            <Card>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  <span className="font-semibold">Action Items ({summary.action_items.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {summary.action_items.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-1">□</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}

        <AccordionItem value="visual-moments">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <span className="font-semibold">Visual Moments ({summary.visual_moments.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  {summary.visual_moments.map((moment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{moment.title}</h4>
                        <TimestampButton 
                          timestamp={moment.timestamp}
                          onClick={() => handleTimestampClick(moment.timestamp)}
                          disabled={!originalUrl || !isYouTubeUrl(originalUrl)}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{moment.description}</p>
                      {moment.frameUrl && (
                        <div className="relative aspect-video bg-gray-100 rounded overflow-hidden">
                          <Image
                            src={moment.frameUrl}
                            alt={`Frame at ${formatTimestamp(moment.timestamp)}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="qa">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                <span className="font-semibold">Q&A ({summary.qa.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0 space-y-4">
                {summary.qa.map((qa, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-start gap-2 mb-2">
                      <h4 className="font-medium">{qa.question}</h4>
                      {qa.timestamp && (
                        <TimestampButton 
                          timestamp={qa.timestamp}
                          onClick={() => handleTimestampClick(qa.timestamp)}
                          disabled={!originalUrl || !isYouTubeUrl(originalUrl)}
                        />
                      )}
                    </div>
                    <p className="text-muted-foreground">{qa.answer}</p>
                  </div>
                ))}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {summary.glossary && summary.glossary.length > 0 && (
          <AccordionItem value="glossary">
            <Card>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <span className="font-semibold">Glossary ({summary.glossary.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="pt-0">
                  <dl className="space-y-4">
                    {summary.glossary.map((item, index) => (
                      <div key={index} className="border-b pb-2 last:border-b-0">
                        <dt className="font-medium">{item.term}</dt>
                        <dd className="text-muted-foreground mt-1">{item.explanation}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}

function TimestampButton({ 
  timestamp, 
  onClick, 
  disabled = false 
}: { 
  timestamp: number
  onClick: () => void
  disabled?: boolean 
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-6 px-2 text-xs"
    >
      <Clock className="h-3 w-3 mr-1" />
      {formatTimestamp(timestamp)}
      {!disabled && <ExternalLink className="h-3 w-3 ml-1" />}
    </Button>
  )
}

function generateMarkdown(summary: Summary): string {
  let markdown = `# Video Summary\n\n`
  markdown += `## TL;DR\n\n${summary.tldr}\n\n`
  
  if (summary.key_points.length > 0) {
    markdown += `## Key Points\n\n`
    summary.key_points.forEach(point => {
      markdown += `- ${point}\n`
    })
    markdown += `\n`
  }
  
  if (summary.chapters.length > 0) {
    markdown += `## Chapters\n\n`
    summary.chapters.forEach(chapter => {
      markdown += `### ${chapter.title} (${formatTimestamp(chapter.start)})\n\n`
      chapter.bullets.forEach(bullet => {
        markdown += `- ${bullet}\n`
      })
      markdown += `\n`
    })
  }
  
  if (summary.action_items.length > 0) {
    markdown += `## Action Items\n\n`
    summary.action_items.forEach(item => {
      markdown += `- [ ] ${item}\n`
    })
    markdown += `\n`
  }
  
  if (summary.qa.length > 0) {
    markdown += `## Q&A\n\n`
    summary.qa.forEach(qa => {
      markdown += `**Q: ${qa.question}**\n\n`
      markdown += `A: ${qa.answer}\n\n`
    })
  }
  
  return markdown
}