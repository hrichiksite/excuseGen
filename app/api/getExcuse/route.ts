import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { context } = await req.json()

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch("https://api.cloudflare.com/client/v4/accounts/"+process.env.CF_ACC_ID+"/ai/run/@cf/meta/llama-3.1-70b-instruct", {
          method: "POST",
          headers: {
            "Authorization": "Bearer "+process.env.CF_TOKEN,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: "You are a creative excuse generator. Generate a funny and clever excuse based on the given context. But it should be practical. Return just the excuse. No quotes."
              },
              {
                role: "user",
                content: `Generate a creative excuse for the context: ${context || 'general situation'}`
              }
            ],
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
                if(line.slice(5)===' [DONE]') return
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

        // Process any remaining data in the buffer
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