"use client"

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Eraser, Pen, Trash2, Download, Undo, Redo, ChevronLeft } from 'lucide-react'
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
      try {
        const board = await getBoard(boardId)
        await saveBoard({
          id: boardId,
          title,
          createdAt: board?.createdAt || Date.now(),
          updatedAt: Date.now(),
          strokes
        })
      } catch (error) {
        console.error("Failed to save board:", error)
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
      return {
        ...prev,
        points: [...prev.points, coords]
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

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Card className="m-4 w-64 shrink-0 flex flex-col gap-6 p-4 h-[calc(100vh-2rem)] bg-white shadow-lg z-10">
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                    <ChevronLeft className="h-4 w-4" />
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
          <h2 className="text-lg font-semibold tracking-tight">Tools</h2>
          <div className="flex gap-2">
            <Button
              variant={tool === 'pen' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('pen')}
              title="Pen"
            >
              <Pen className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('eraser')}
              title="Eraser"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

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
            <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={undo} disabled={strokes.length === 0}>
                    <Undo className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={redo} disabled={redoStack.length === 0}>
                    <Redo className="h-4 w-4" />
                </Button>
            </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={clearCanvas} className="w-full justify-start">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button variant="outline" onClick={downloadCanvas} className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Save Img
            </Button>
          </div>
        </div>
        
        <div className="mt-auto text-xs text-muted-foreground text-center">
          Auto-saving...
        </div>
      </Card>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 relative h-full cursor-crosshair">
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
  )
}