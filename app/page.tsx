"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Moon, Sun, Clipboard, Check, Mic } from "lucide-react"

export default function EnhancedExcuseGenerator() {
  const [context, setContext] = useState('')
  const [excuse, setExcuse] = useState('')
  const [excuseHistory, setExcuseHistory] = useState([])
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioData, setAudioData] = useState({text:'', data:''})
  const audioRef = useRef(new Audio())

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode')
    if (savedMode) {
      setIsDarkMode(JSON.parse(savedMode))
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode)
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  const generateExcuse = async () => {
    setIsLoading(true)
    setExcuse('')
    try {
      const response = await fetch('/api/getExcuse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()
      let accumulatedExcuse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        accumulatedExcuse += chunk
        setExcuse(accumulatedExcuse)
      }
      //@ts-ignore
      setExcuseHistory(prev => [accumulatedExcuse, ...prev.slice(0, 4)])
    } catch (error) {
      console.error('Error generating excuse:', error)
      setExcuse('Failed to generate an excuse. Please try again.')
    }
    setIsLoading(false)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(excuse)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const playTTS = async () => {
    try {
      if(audioData.text === excuse) {
        setIsPlaying(true)
        try{
        audioRef.current.src = `data:audio/mp3;base64,${audioData.data}`
        await audioRef.current.play()
        return
        } catch (error) {
          console.error('Error playing TTS:', error)
        } finally {
          setIsPlaying(false)
        }
      }
      setIsPlaying(true)
      const response = await fetch('https://countik.com/api/text/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: excuse, voice: "en_us_001" }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.status) {
        audioRef.current.src = `data:audio/mp3;base64,${data.v_data}`
        await audioRef.current.play()
        setAudioData({text:excuse, data:data.v_data})
      } else {
        throw new Error('Failed to get TTS data')
      }
    } catch (error) {
      console.error('Error playing TTS:', error)
    } finally {
      setIsPlaying(false)
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    audio.onended = () => setIsPlaying(false)
    return () => {
      audio.onended = null
    }
  }, [])

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-6xl font-bold">EXCUSE GENERATOR</h1>
          <Button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-full ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
          >
            {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-8">
          <Input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Enter context (e.g., 'homework', 'meeting')"
            className={`flex-grow border-4 ${isDarkMode ? 'border-white' : 'border-black'} text-2xl p-4 focus:outline-none bg-transparent`}
          />
          <Button
            onClick={generateExcuse}
            disabled={isLoading}
            className={`text-2xl px-8 py-4 border-4 ${
              isDarkMode 
                ? 'border-white bg-white text-black hover:bg-black hover:text-white' 
                : 'border-black bg-black text-white hover:bg-white hover:text-black'
            } transition-colors`}
          >
            {isLoading ? 'GENERATING...' : 'GENERATE'}
          </Button>
        </div>

        {excuse && (
          <div className={`w-full bg-yellow-300 border-4 ${isDarkMode ? 'border-white' : 'border-black'} p-6 mb-8 animate-fade-in relative`}>
            <p className="text-3xl font-bold text-black pr-12">{excuse}</p>
            <div className="absolute top-2 right-2 flex flex-col space-y-2">
              <Button
                onClick={copyToClipboard}
                className="bg-transparent hover:bg-yellow-400 text-black"
              >
                {isCopied ? <Check className="h-6 w-6" /> : <Clipboard className="h-6 w-6" />}
              </Button>
              <Button
                onClick={playTTS}
                disabled={isPlaying}
                className="bg-transparent hover:bg-yellow-400 text-black"
              >
                <Mic className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}

        {excuseHistory.length > 0 && (
          <div className={`border-4 ${isDarkMode ? 'border-white' : 'border-black'} p-6`}>
            <h2 className="text-3xl font-bold mb-4">EXCUSE HISTORY</h2>
            <ul className="space-y-2">
              {excuseHistory.map((historyExcuse, index) => (
                <li key={index} className="text-xl">{historyExcuse}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}