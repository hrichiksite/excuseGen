"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Moon, Sun, Clipboard, Check, Mic, Shuffle, Info } from 'lucide-react'

const HUMOR_MODES = ['Serious', 'Witty', 'Ridiculous']
const HUMOR_STYLES = ['American', 'British', 'Indian']

export default function EnhancedExcuseGenerator() {
  const [context, setContext] = useState('')
  const [excuse, setExcuse] = useState('')
  const [excuseHistory, setExcuseHistory] = useState<string[]>([])
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  const [humorMode, setHumorMode] = useState('Serious')
  const [excuseFor, setExcuseFor] = useState('')
  const [humorStyle, setHumorStyle] = useState('American')
  const [believabilityScale, setBelievabilityScale] = useState(50)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioData, setAudioData] = useState({ text: "", data: "" })
  useEffect(() => {
    // Initialize Audio only on the client side
    audioRef.current = new Audio();
  }, []);

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

  const generateExcuse = async (isLucky = false) => {
    setIsLoading(true)
    setExcuse('')
    try {
      const response = await fetch('/api/getExcuse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          isAdvancedMode,
          humorMode: isLucky ? HUMOR_MODES[Math.floor(Math.random() * HUMOR_MODES.length)] : humorMode,
          excuseFor: isLucky ? '' : excuseFor,
          humorStyle: isLucky ? HUMOR_STYLES[Math.floor(Math.random() * HUMOR_STYLES.length)] : humorStyle,
          believabilityScale: isLucky ? Math.floor(Math.random() * 100) : believabilityScale,
        }),
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
      setIsPlaying(true)
      if (audioRef.current) {
        if (audioData.text === excuse) {
          setIsPlaying(true)
          try {
            audioRef.current!.src = `data:audio/mp3;base64,${audioData.data}`
            await audioRef.current!.play()
            return
          } catch (error) {
            console.error('Error playing TTS:', error)
          } finally {
            setIsPlaying(false)
          }
        }
        const response = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: excuse, voice: 'en_us_001' }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        if (data.success) {
          audioRef.current.src = `data:audio/mp3;base64,${data.data}`
          console.log({ text: excuse, data: data.data })
          setAudioData({ text: excuse, data: data.data })
          await audioRef.current!.play()
        }
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
    if (!audioRef.current) return
    const audio = audioRef.current
    audio.onended = () => setIsPlaying(false)
    return () => {
      audio.onended = null
    }
  }, [])

  const InfoTooltip = ({ content }: { content: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-4 w-4 ml-2" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

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

        <div className="flex items-center space-x-2 mb-4">
          <Switch
            checked={isAdvancedMode}
            onCheckedChange={setIsAdvancedMode}
            id="advanced-mode"
          />
          <label htmlFor="advanced-mode" className="text-lg font-medium">
            Advanced Mode
          </label>
          <InfoTooltip content="Enable additional options for customizing your excuse" />
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
            onClick={() => generateExcuse()}
            disabled={isLoading}
            className={`text-2xl px-8 py-4 border-4 ${isDarkMode
              ? 'border-white bg-white text-black hover:bg-black hover:text-white'
              : 'border-black bg-black text-white hover:bg-white hover:text-black'
              } transition-colors`}
          >
            {isLoading ? 'GENERATING...' : 'GENERATE'}
          </Button>
        </div>

        {isAdvancedMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
              <label htmlFor="humor-mode" className="block text-lg font-medium mb-2">
                Humor Mode
                <InfoTooltip content="Choose the level of humor for your excuse" />
              </label>
              <Select value={humorMode} onValueChange={setHumorMode}>
                <SelectTrigger id="humor-mode">
                  <SelectValue placeholder="Select humor mode" />
                </SelectTrigger>
                <SelectContent>
                  {HUMOR_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="excuse-for" className="block text-lg font-medium mb-2">
                Excuse For
                <InfoTooltip content="Specify who the excuse is intended for" />
              </label>
              <Input
                id="excuse-for"
                type="text"
                value={excuseFor}
                onChange={(e) => setExcuseFor(e.target.value)}
                placeholder="Who needs the excuse?"
                className={`w-full border-4 ${isDarkMode ? 'border-white' : 'border-black'} p-2 focus:outline-none bg-transparent`}
              />
            </div>
            <div>
              <label htmlFor="humor-style" className="block text-lg font-medium mb-2">
                Humor Style
                <InfoTooltip content="Select the cultural style of humor for your excuse" />
              </label>
              <Select value={humorStyle} onValueChange={setHumorStyle}>
                <SelectTrigger id="humor-style">
                  <SelectValue placeholder="Select humor style" />
                </SelectTrigger>
                <SelectContent>
                  {HUMOR_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="believability" className="block text-lg font-medium mb-2">
                Believability Scale: {believabilityScale}
                <InfoTooltip content="Adjust how believable your excuse should be" />
              </label>
              <Slider
                id="believability"
                min={0}
                max={100}
                step={1}
                value={[believabilityScale]}
                onValueChange={(value) => setBelievabilityScale(value[0])}
              />
            </div>
          </div>
        )}

        <div className="flex justify-center mb-8">
          <Button
            onClick={() => generateExcuse(true)}
            className={`text-xl px-6 py-3 border-4 ${isDarkMode
              ? 'border-white bg-white text-black hover:bg-black hover:text-white'
              : 'border-black bg-black text-white hover:bg-white hover:text-black'
              } transition-colors`}
          >
            <Shuffle className="mr-2 h-5 w-5" />
            I'm Feeling Lucky
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