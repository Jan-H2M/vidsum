import OpenAI from 'openai'
import { Summary, TranscriptSegment, VisionCaption } from './types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function generateSummary(
  jobId: string,
  transcript: TranscriptSegment[],
  visionCaptions: VisionCaption[],
  duration: number,
  language: string
): Promise<Summary> {
  try {
    const prompt = createSummaryPrompt(transcript, visionCaptions, duration, language)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: "You are an analytical video analyst. Your goal is to create clear video summaries with exact timestamps, chapters, and action items. You combine audio content (transcript) with visual context (captions/objects/OCR) to produce rich, compact results. Be factual, concise, and structure your output strictly as valid JSON according to the given TypeScript type \"Summary\"."
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4096,
      temperature: 0.1
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const summaryData = JSON.parse(content)
    
    return {
      jobId,
      tldr: summaryData.tldr || '',
      key_points: summaryData.key_points || [],
      chapters: summaryData.chapters || [],
      action_items: summaryData.action_items || [],
      glossary: summaryData.glossary || [],
      qa: summaryData.qa || [],
      visual_moments: summaryData.visual_moments || [],
      sources: {
        transcriptProvider: 'OpenAI Whisper',
        visionProvider: 'OpenAI GPT-4 Vision',
        ocrProvider: 'OpenAI GPT-4 Vision',
        llm: 'OpenAI GPT-4'
      }
    }
  } catch (error) {
    console.error('Summary generation error:', error)
    throw new Error(`Failed to generate summary: ${error}`)
  }
}

function createSummaryPrompt(
  transcript: TranscriptSegment[],
  visionCaptions: VisionCaption[],
  duration: number,
  language: string
): string {
  const transcriptJson = JSON.stringify(transcript, null, 2)
  const visionJson = JSON.stringify(visionCaptions, null, 2)
  
  return `Context:
- User goal: Get a video summary with TL;DR, key points, chapters with timestamps, action items, Q&A, and important visual moments (slide transitions, demos, charts, products shown).
- Video duration (ms): ${duration}
- Transcript language: ${language}

Data:
TRANSCRIPT_SEGMENTS (JSON): 
${transcriptJson}

VISION_CAPTIONS (JSON):
${visionJson}

Instructions:
1) Combine transcript + visual info.
2) Create "chapters" that logically segment the video (title + bullets).
3) Add "visual_moments" when visual analysis shows slides, products, screen demos, or charts; reference frameUrl if available.
4) "action_items": create tasks/next steps if the video is a briefing/meeting/tutorial.
5) "qa": formulate 5 relevant questions+answers someone would typically ask after watching the video, with timestamp if appropriate.
6) Use **short sentences** and **max 8 bullets per section**.
7) Respect **the JSON schema** exactly; provide no extra text outside the JSON.

Return only the JSON result.`
}