import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    const response = await fetch('https://countik.com/api/text/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error('Failed to generate TTS')
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to generate TTS' }, { status: 500 })
  }
}