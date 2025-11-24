"use client"

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Eraser, Pen, Trash2, Download, Undo, Redo, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { saveBoard, getBoard, type Stroke, type Point } from '@/lib/db'
import { useRouter } from 'next/navigation'
import { generateBoardName } from '@/lib/name-generator'

type Tool = 'pen' | 'eraser'

interface WhiteboardProps {
  boardId: string
}

export function Whiteboard({ boardId }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<Tool>('pen')
  const [brushSize, setBrushSize] = useState([5])
  const [color] = useState('#000000')
  const [title, setTitle] = useState('Untitled Board')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
  
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [redoStack, setRedoStack] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  
  const router = useRouter()

  // Load board data
  useEffect(() => {
    const loadBoard = async () => {
      try {
        const board = await getBoard(boardId)
        if (board) {
          setTitle(board.title)
          setStrokes(board.strokes)
        } else {
          // New board, save initial state
          const newTitle = generateBoardName()
          setTitle(newTitle)
          await saveBoard({
            id: boardId,
            title: newTitle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            strokes: []
          })
        }
      } catch (error) {
        console.error("Failed to load board:", error)
      }
    }
    loadBoard()
  }, [boardId])

  // Save board data (debounced or on change)
  useEffect(() => {
    const save = async () => {
      setSaveStatus('saving')
      try {
        const board = await getBoard(boardId)
        await saveBoard({
          id: boardId,
          title,
          createdAt: board?.createdAt || Date.now(),
          updatedAt: Date.now(),
          strokes
        })
        setTimeout(() => setSaveStatus('saved'), 1000)
      } catch (error) {
        console.error("Failed to save board:", error)
        setSaveStatus('idle')
      }
    }
    
    const timeoutId = setTimeout(save, 1000) // Auto-save after 1s of inactivity
    return () => clearTimeout(timeoutId)
  }, [boardId, title, strokes])

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 1) return

    ctx.beginPath()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color
    ctx.lineWidth = stroke.size

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
  }

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    
    // Only resize if dimensions changed to avoid flickering/clearing
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
        ctx.scale(dpr, dpr)
    }

    // Clear and fill white
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw all saved strokes
    strokes.forEach(stroke => drawStroke(ctx, stroke))

    // Draw current stroke
    if (currentStroke) {
      drawStroke(ctx, currentStroke)
    }
  }, [strokes, currentStroke])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => renderCanvas()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [renderCanvas])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    let clientX, clientY

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const coords = getCoordinates(e)
    if (!coords) return

    setIsDrawing(true)
    setCurrentStroke({
      points: [coords],
      color: color,
      size: brushSize[0],
      tool: tool
    })
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !currentStroke) return

    const coords = getCoordinates(e)
    if (!coords) return

    setCurrentStroke(prev => {
      if (!prev) return null
      
      // Apply 10% smoothing by interpolating with the last point
      const lastPoint = prev.points[prev.points.length - 1]
      const smoothingFactor = 0.15
      const smoothedPoint = {
        x: lastPoint.x + (coords.x - lastPoint.x) * (1 - smoothingFactor),
        y: lastPoint.y + (coords.y - lastPoint.y) * (1 - smoothingFactor)
      }
      
      return {
        ...prev,
        points: [...prev.points, smoothedPoint]
      }
    })
  }

  const stopDrawing = () => {
    if (!isDrawing || !currentStroke) return
    
    setIsDrawing(false)
    setStrokes(prev => [...prev, currentStroke])
    setCurrentStroke(null)
    setRedoStack([]) // Clear redo stack on new action
  }

  const undo = () => {
    if (strokes.length === 0) return
    const newStrokes = [...strokes]
    const poppedStroke = newStrokes.pop()
    if (poppedStroke) {
      setStrokes(newStrokes)
      setRedoStack(prev => [...prev, poppedStroke])
    }
  }

  const redo = () => {
    if (redoStack.length === 0) return
    const newRedoStack = [...redoStack]
    const poppedStroke = newRedoStack.pop()
    if (poppedStroke) {
      setRedoStack(newRedoStack)
      setStrokes(prev => [...prev, poppedStroke])
    }
  }

  const clearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the whiteboard?')) {
        setStrokes([])
        setRedoStack([])
    }
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const cursorStyle = useMemo(() => {
    const size = brushSize[0];
    const half = size / 2;
    const svg = `
      <svg width="${size + 2}" height="${size + 2}" viewBox="0 0 ${size + 2} ${size + 2}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${half + 1}" cy="${half + 1}" r="${half}" fill="none" stroke="black" stroke-width="1" />
        <circle cx="${half + 1}" cy="${half + 1}" r="${half - 1}" fill="none" stroke="white" stroke-width="1" />
      </svg>
    `;
    const encoded = typeof window !== 'undefined' ? window.btoa(svg) : '';
    return { cursor: `url("data:image/svg+xml;base64,${encoded}") ${half + 1} ${half + 1}, auto` };
  }, [brushSize]);

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      {/* Canvas Area */}
      <div className="flex-1 p-8 flex items-center justify-center">
        <div ref={containerRef} className="w-full h-full bg-white rounded-2xl shadow-lg relative overflow-hidden" style={cursorStyle}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="absolute top-0 left-0 touch-none"
          />
        </div>
      </div>

      {/* Sidebar */}
      <Card className="m-4 w-64 shrink-0 flex flex-col gap-4 p-4 h-[calc(100vh-2rem)] bg-white shadow-lg z-10">
        <div className="space-y-4">
            <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="self-start -ml-2 text-muted-foreground">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Home
                </Button>
                <Input
                    value={title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    className="h-8 font-semibold"
                />
            </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Tools</h2>
          <div className="flex bg-muted p-1 rounded-lg">
            <div className="grid grid-cols-2 w-full gap-1">
                <Button
                    variant={tool === 'pen' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTool('pen')}
                    className={tool === 'pen' ? 'bg-white shadow-sm' : 'hover:bg-transparent'}
                >
                    <Pen className="h-4 w-4 mr-2" /> Pen
                </Button>
                <Button
                    variant={tool === 'eraser' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTool('eraser')}
                    className={tool === 'eraser' ? 'bg-white shadow-sm' : 'hover:bg-transparent'}
                >
                    <Eraser className="h-4 w-4 mr-2" /> Eraser
                </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium">Size</h2>
            <span className="text-xs text-muted-foreground">{brushSize[0]}px</span>
          </div>
          <Slider
            value={brushSize}
            onValueChange={setBrushSize}
            max={50}
            min={1}
            step={1}
            className="w-full"
          />
        </div>

        <Separator />

        <div className="space-y-2">
            <h2 className="text-sm font-medium">History</h2>
            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={undo} disabled={strokes.length === 0}>
                    <Undo className="h-4 w-4 mr-2" /> Undo
                </Button>
                <Button variant="outline" onClick={redo} disabled={redoStack.length === 0}>
                    <Redo className="h-4 w-4 mr-2" /> Redo
                </Button>
            </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Actions</h2>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={downloadCanvas} className="w-full justify-center">
              <Download className="mr-2 h-4 w-4" />
              Save Image
            </Button>
            <Button variant="outline" onClick={clearCanvas} className="w-full justify-center">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Board
            </Button>
          </div>
        </div>
        
        <div className="mt-auto flex items-center justify-center text-xs text-muted-foreground h-6">
            {saveStatus === 'saving' && (
                <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Saving...
                </>
            )}
            {saveStatus === 'saved' && (
                <>
                    <Check className="h-3 w-3 mr-2" />
                    Saved
                </>
            )}
        </div>
      </Card>
    </div>
  )
}