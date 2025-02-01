import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { context, believabilityScale, excuseFor, humorMode, humorStyle, isAdvancedMode } = await req.json();
  let aiContext = [
    {
      role: "system",
      content: "You are a creative excuse generator. Generate a funny and clever excuse based on the given context. But it should be practical. Return just the excuse. No quotes."
    },
    {
      role: "user",
      content: `Generate a creative excuse for the following context: ${context || 'general situation'}`
    }
  ]

  if (context.includes('Excuse my previous excuse: ')) {
    aiContext[1].content = `Add a layer of meta humor to why this excuse didn't work: ${context.replace('Excuse my previous excuse: ', '') || 'general situation'}`
  } else if (context.includes('Cancel my excuse :')) {
    aiContext[1].content = `Generate a new excuse to cancel the previous excuse: ${context.replace('Cancel my excuse :', '') || 'general situation'}`
  }

  if (isAdvancedMode) {
    // Advanced mode has multiple options for the AI to consider, it is added to the system prompt
    aiContext[0].content = "You are a creative excuse generator. Generate excuses based on the given context. The excuse would be personalised according to user's settings." +
      "\nYou can choose the believability scale, excuse for, humor mode, and humor style." +
      "\nBelievability scale: How believable the excuse should be" +
      "\nExcuse for: Who is the excuse for, Boss, Friend, etc. Can be considered while giving the excuse as not all excuses for work everyone" +
      "\nHumor mode: How the user wants the excuse, serious?, humor?" +
      "\nHumor Style: If the excuse should adapt to a local humor setting like monsoon-related delays in India or Thanksgiving meal prep in the US. Can even use words (in english) from other languages such as Hinlish for India. For example 'Arey' is a good way to call someone in a Indian Style excuse (you do not need to include it in every excuse)." +
      "\nReturn just the excuse. No quotes."

    aiContext[1].content += `\nBelievability scale: ${believabilityScale || 'medium'}. Recipient for: ${excuseFor || 'being late'}. Humor mode: ${humorMode || 'random'}. Humor style: ${humorStyle || 'random'}. Context: ${context || 'general situation'}`
  } else {
    // No change
  }
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + process.env.CF_ACC_ID + "/ai/run/@cf/meta/llama-3.1-70b-instruct", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + process.env.CF_TOKEN,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: aiContext,
            stream: true
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('Response body is not readable')
        }

        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                if (line.slice(5) === ' [DONE]') return
                const data = JSON.parse(line.slice(5))
                if (data.response) {
                  controller.enqueue(encoder.encode(data.response))
                }
              } catch (error) {
                console.error('Error parsing JSON:', error)
                // If JSON parsing fails, send the raw line content
                controller.enqueue(encoder.encode(line.slice(5)))
              }
            }
          }
        }

        if (buffer) {
          controller.enqueue(encoder.encode(buffer))
        }
      } catch (error) {
        console.error('Error:', error)
        controller.enqueue(encoder.encode('Failed to generate excuse. Please try again.'))
      } finally {
        controller.close()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
    },
  })
}