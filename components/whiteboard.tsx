"use client"

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Eraser, Pen, MousePointer2, Trash2, Download, Undo, Redo, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { ColorPicker } from '@/components/ui/color-picker'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { DropdownMenu, DropdownMenuItem, type ContextMenuPoint } from '@/components/ui/dropdown-menu'
import { saveBoard, getBoard, type Stroke, type Point } from '@/lib/data-client'
import { useRouter } from 'next/navigation'
import { generateBoardName } from '@/lib/name-generator'
import { getSmoothingFactor, usePenSmoothing, useShowSaveStatus } from '@/lib/drawing-settings'
import { useDarkCanvas } from '@/lib/interface-settings'

const LIGHT_CANVAS_COLOR = '#ffffff'
const DARK_CANVAS_COLOR = '#111318'
const CARDINAL_SNAP_THRESHOLD = 5 * Math.PI / 180
const SELECTION_COLOR = '#3b82f6'

function snapToCardinalAngle(start: Point, end: Point): Point {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const distance = Math.hypot(deltaX, deltaY)
  const angle = Math.atan2(deltaY, deltaX)
  const quarterTurn = Math.round(angle / (Math.PI / 2))
  const snappedAngle = quarterTurn * (Math.PI / 2)

  if (Math.abs(angle - snappedAngle) > CARDINAL_SNAP_THRESHOLD) {
    return end
  }

  switch ((quarterTurn % 4 + 4) % 4) {
    case 0:
      return { x: start.x + distance, y: start.y }
    case 1:
      return { x: start.x, y: start.y + distance }
    case 2:
      return { x: start.x - distance, y: start.y }
    default:
      return { x: start.x, y: start.y - distance }
  }
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const lengthSquared = deltaX * deltaX + deltaY * deltaY

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const projection = Math.max(0, Math.min(1,
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared
  ))
  const closestX = start.x + projection * deltaX
  const closestY = start.y + projection * deltaY
  return Math.hypot(point.x - closestX, point.y - closestY)
}

function hitTestStroke(strokes: Stroke[], point: Point) {
  for (let strokeIndex = strokes.length - 1; strokeIndex >= 0; strokeIndex -= 1) {
    const stroke = strokes[strokeIndex]
    const hitTolerance = Math.max(8, stroke.size / 2 + 5)
    let isHit = false

    if (stroke.points.length === 1) {
      isHit = Math.hypot(
        point.x - stroke.points[0].x,
        point.y - stroke.points[0].y
      ) <= hitTolerance
    } else {
      for (let pointIndex = 1; pointIndex < stroke.points.length; pointIndex += 1) {
        if (distanceToSegment(point, stroke.points[pointIndex - 1], stroke.points[pointIndex]) <= hitTolerance) {
          isHit = true
          break
        }
      }
    }

    if (isHit) {
      return stroke.tool === 'pen' ? strokeIndex : null
    }
  }

  return null
}

function translateStroke(stroke: Stroke, offset: Point): Stroke {
  return {
    ...stroke,
    points: stroke.points.map(point => ({
      x: point.x + offset.x,
      y: point.y + offset.y
    }))
  }
}

type Tool = 'cursor' | 'pen' | 'eraser'

interface CanvasContextMenu extends ContextMenuPoint {
  canvasPoint: Point
  strokeIndex: number | null
}

type CanvasAction =
  | { type: 'add'; index: number; stroke: Stroke }
  | { type: 'delete'; index: number; stroke: Stroke }
  | { type: 'move'; index: number; before: Stroke; after: Stroke }

function applyCanvasAction(strokes: Stroke[], action: CanvasAction, direction: 'undo' | 'redo') {
  const nextStrokes = [...strokes]

  if (action.type === 'add') {
    if (direction === 'undo') {
      nextStrokes.splice(action.index, 1)
    } else {
      nextStrokes.splice(action.index, 0, action.stroke)
    }
  } else if (action.type === 'delete') {
    if (direction === 'undo') {
      nextStrokes.splice(action.index, 0, action.stroke)
    } else {
      nextStrokes.splice(action.index, 1)
    }
  } else {
    nextStrokes[action.index] = direction === 'undo' ? action.before : action.after
  }

  return nextStrokes
}

interface WhiteboardProps {
  boardId: string
}

export function Whiteboard({ boardId }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeSavesRef = useRef(0)
  const isStraightLineRef = useRef(false)
  const draggedStrokeIndexRef = useRef<number | null>(null)
  const dragStartRef = useRef<Point | null>(null)
  const draggedStrokeRef = useRef<Stroke | null>(null)
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<Tool>('pen')
  const [brushSize, setBrushSize] = useState([5])
  const [penSize, setPenSize] = useState(5)
  const [eraserSize, setEraserSize] = useState(20)
  const [color, setColor] = useState('#000000')
  const [title, setTitle] = useState('Untitled Board')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  const [loadedBoardId, setLoadedBoardId] = useState<string | null>(null)
  const penSmoothing = usePenSmoothing()
  const showSaveStatus = useShowSaveStatus()
  const darkCanvas = useDarkCanvas()
  const canvasColor = darkCanvas ? DARK_CANVAS_COLOR : LIGHT_CANVAS_COLOR
  const effectiveColor = darkCanvas && color.toLowerCase() === '#000000'
    ? '#FFFFFF'
    : !darkCanvas && color.toLowerCase() === '#ffffff'
      ? '#000000'
      : color
  
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [undoStack, setUndoStack] = useState<CanvasAction[]>([])
  const [redoStack, setRedoStack] = useState<CanvasAction[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [selectedStrokeIndex, setSelectedStrokeIndex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  const [clipboardStroke, setClipboardStroke] = useState<Stroke | null>(null)
  const [contextMenu, setContextMenu] = useState<CanvasContextMenu | null>(null)
  
  const [showClearModal, setShowClearModal] = useState(false)
  
  const router = useRouter()

  // Load board data
  useEffect(() => {
    let cancelled = false

    const loadBoard = async () => {
      try {
        const board = await getBoard(boardId)
        if (cancelled) return

        if (board) {
          setTitle(board.title)
          setStrokes(board.strokes)
          setUndoStack(board.strokes.map((stroke, index) => ({ type: 'add', index, stroke })))
          setRedoStack([])
          setSelectedStrokeIndex(null)
        } else {
          // New board, save initial state
          const newTitle = generateBoardName()
          setTitle(newTitle)
          setStrokes([])
          setUndoStack([])
          setRedoStack([])
          setSelectedStrokeIndex(null)
          await saveBoard({
            id: boardId,
            title: newTitle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            strokes: [],
            folderId: null
          })
        }
      } catch (error) {
        console.error("Failed to load board:", error)
      } finally {
        if (!cancelled) setLoadedBoardId(boardId)
      }
    }
    loadBoard()

    return () => {
      cancelled = true
    }
  }, [boardId])

  // Save as soon as a completed stroke or another board value changes.
  useEffect(() => {
    if (loadedBoardId !== boardId) return

    const save = async () => {
      activeSavesRef.current += 1
      setSaveStatus('saving')

      try {
        const board = await getBoard(boardId)
        await saveBoard({
          id: boardId,
          title,
          createdAt: board?.createdAt || Date.now(),
          updatedAt: Date.now(),
          strokes,
          folderId: board?.folderId || null
        })
      } catch (error) {
        console.error("Failed to save board:", error)
      } finally {
        activeSavesRef.current -= 1
        if (activeSavesRef.current === 0) setSaveStatus('saved')
      }
    }

    void save()
  }, [boardId, loadedBoardId, title, strokes])

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, offsetX = 0, offsetY = 0) => {
    if (stroke.points.length < 1) return

    ctx.beginPath()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = stroke.tool === 'eraser' ? canvasColor : stroke.color
    ctx.lineWidth = stroke.size

    ctx.moveTo(stroke.points[0].x + offsetX, stroke.points[0].y + offsetY)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x + offsetX, stroke.points[i].y + offsetY)
    }
    ctx.stroke()
  }, [canvasColor])

  const drawSelection = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, offset: Point) => {
    if (stroke.points.length < 1) return

    ctx.save()
    ctx.beginPath()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = SELECTION_COLOR
    ctx.lineWidth = stroke.size + 6
    ctx.globalAlpha = 0.7
    ctx.moveTo(stroke.points[0].x + offset.x, stroke.points[0].y + offset.y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x + offset.x, stroke.points[i].y + offset.y)
    }
    ctx.stroke()
    ctx.restore()

    drawStroke(ctx, stroke, offset.x, offset.y)
  }, [drawStroke])

  const renderCanvas = useCallback((includeSelection = true) => {
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

    // Clear and fill with the selected canvas surface.
    ctx.fillStyle = canvasColor
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw all saved strokes
    strokes.forEach((stroke, index) => {
      if (index === selectedStrokeIndex && isDrawing && tool === 'cursor') {
        drawStroke(ctx, stroke, dragOffset.x, dragOffset.y)
      } else {
        drawStroke(ctx, stroke)
      }
    })

    // Draw current stroke
    if (currentStroke) {
      drawStroke(ctx, currentStroke)
    }

    if (includeSelection && selectedStrokeIndex !== null) {
      const selectedStroke = strokes[selectedStrokeIndex]
      if (selectedStroke) {
        const offset = isDrawing && tool === 'cursor' ? dragOffset : { x: 0, y: 0 }
        drawSelection(ctx, selectedStroke, offset)
      }
    }
  }, [strokes, currentStroke, canvasColor, drawStroke, drawSelection, selectedStrokeIndex, isDrawing, tool, dragOffset])

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
    if ('button' in e && e.button !== 0) return
    setContextMenu(null)
    const coords = getCoordinates(e)
    if (!coords) return

    if (tool === 'cursor') {
      const strokeIndex = hitTestStroke(strokes, coords)
      setSelectedStrokeIndex(strokeIndex)
      setCurrentStroke(null)

      if (strokeIndex === null) {
        setIsDrawing(false)
        draggedStrokeIndexRef.current = null
        dragStartRef.current = null
        draggedStrokeRef.current = null
        dragOffsetRef.current = { x: 0, y: 0 }
        setDragOffset({ x: 0, y: 0 })
        return
      }

      setIsDrawing(true)
      draggedStrokeIndexRef.current = strokeIndex
      dragStartRef.current = coords
      draggedStrokeRef.current = strokes[strokeIndex]
      dragOffsetRef.current = { x: 0, y: 0 }
      setDragOffset({ x: 0, y: 0 })
      return
    }

    isStraightLineRef.current = 'shiftKey' in e && e.shiftKey
    setIsDrawing(true)
    setCurrentStroke({
      points: [coords],
      color: effectiveColor,
      size: brushSize[0],
      tool: tool
    })
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return

    const coords = getCoordinates(e)
    if (!coords) return

    if (tool === 'cursor') {
      const dragStart = dragStartRef.current
      if (!dragStart || draggedStrokeIndexRef.current === null) return

      const nextOffset = {
        x: coords.x - dragStart.x,
        y: coords.y - dragStart.y
      }
      dragOffsetRef.current = nextOffset
      setDragOffset(nextOffset)
      return
    }

    if (!currentStroke) return

    setCurrentStroke(prev => {
      if (!prev) return null

      if (isStraightLineRef.current) {
        return {
          ...prev,
          points: [prev.points[0], snapToCardinalAngle(prev.points[0], coords)]
        }
      }
      
      // Interpolate with the last point using the selected smoothing level.
      const lastPoint = prev.points[prev.points.length - 1]
      const smoothingFactor = getSmoothingFactor(penSmoothing)
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
    if (!isDrawing) return

    if (tool === 'cursor') {
      const strokeIndex = draggedStrokeIndexRef.current
      const originalStroke = draggedStrokeRef.current
      const offset = dragOffsetRef.current
      const hasMoved = offset.x !== 0 || offset.y !== 0

      setIsDrawing(false)
      dragStartRef.current = null
      draggedStrokeIndexRef.current = null
      draggedStrokeRef.current = null
      dragOffsetRef.current = { x: 0, y: 0 }
      setDragOffset({ x: 0, y: 0 })

      if (strokeIndex !== null && originalStroke && hasMoved) {
        const movedStroke = translateStroke(originalStroke, offset)
        setStrokes(prev => prev.map((stroke, index) => index === strokeIndex ? movedStroke : stroke))
        setUndoStack(prev => [...prev, {
          type: 'move',
          index: strokeIndex,
          before: originalStroke,
          after: movedStroke
        }])
        setRedoStack([])
      }
      return
    }

    if (!currentStroke) return
    
    setIsDrawing(false)
    isStraightLineRef.current = false
    const strokeIndex = strokes.length
    setStrokes(prev => [...prev, currentStroke])
    setUndoStack(prev => [...prev, { type: 'add', index: strokeIndex, stroke: currentStroke }])
    setCurrentStroke(null)
    setRedoStack([]) // Clear redo stack on new action
  }

  const undo = useCallback(() => {
    const action = undoStack[undoStack.length - 1]
    if (!action) return

    setStrokes(previousStrokes => applyCanvasAction(previousStrokes, action, 'undo'))
    setUndoStack(undoStack.slice(0, -1))
    setRedoStack(previousRedoStack => [...previousRedoStack, action])
    setSelectedStrokeIndex(null)
  }, [undoStack])

  const redo = useCallback(() => {
    const action = redoStack[redoStack.length - 1]
    if (!action) return

    setStrokes(previousStrokes => applyCanvasAction(previousStrokes, action, 'redo'))
    setRedoStack(redoStack.slice(0, -1))
    setUndoStack(previousUndoStack => [...previousUndoStack, action])
    setSelectedStrokeIndex(null)
  }, [redoStack])

  const deleteStroke = useCallback((strokeIndex: number | null) => {
    if (strokeIndex === null) return

    const selectedStroke = strokes[strokeIndex]
    if (!selectedStroke) {
      setSelectedStrokeIndex(null)
      return
    }

    setStrokes(prev => prev.filter((_, index) => index !== strokeIndex))
    setUndoStack(prev => [...prev, {
      type: 'delete',
      index: strokeIndex,
      stroke: selectedStroke
    }])
    setRedoStack([])
    setSelectedStrokeIndex(null)
  }, [strokes])

  const deleteSelectedStroke = useCallback(() => {
    deleteStroke(selectedStrokeIndex)
  }, [deleteStroke, selectedStrokeIndex])

  const copyContextStroke = useCallback(() => {
    if (contextMenu?.strokeIndex === null || contextMenu?.strokeIndex === undefined) return
    const stroke = strokes[contextMenu.strokeIndex]
    if (stroke) setClipboardStroke(structuredClone(stroke))
  }, [contextMenu, strokes])

  const cutContextStroke = useCallback(() => {
    copyContextStroke()
    deleteStroke(contextMenu?.strokeIndex ?? null)
  }, [contextMenu, copyContextStroke, deleteStroke])

  const pasteContextStroke = useCallback(() => {
    if (!clipboardStroke || !contextMenu) return

    const firstPoint = clipboardStroke.points[0]
    if (!firstPoint) return

    const pastedStroke = translateStroke(structuredClone(clipboardStroke), {
      x: contextMenu.canvasPoint.x - firstPoint.x,
      y: contextMenu.canvasPoint.y - firstPoint.y
    })
    const strokeIndex = strokes.length
    setStrokes(prev => [...prev, pastedStroke])
    setUndoStack(prev => [...prev, { type: 'add', index: strokeIndex, stroke: pastedStroke }])
    setRedoStack([])
    setSelectedStrokeIndex(strokeIndex)
  }, [clipboardStroke, contextMenu, strokes.length])

  const openContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvasPoint = getCoordinates(event)
    if (!canvasPoint) return

    const strokeIndex = hitTestStroke(strokes, canvasPoint)
    setSelectedStrokeIndex(strokeIndex)
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      canvasPoint,
      strokeIndex
    })
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditingText = target?.isContentEditable
        || target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'

      if (isEditingText) return

      if (selectedStrokeIndex !== null && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        deleteSelectedStroke()
        return
      }

      if (!event.metaKey || event.key.toLowerCase() !== 'z') return

      event.preventDefault()
      if (event.shiftKey) {
        redo()
      } else {
        undo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedStroke, redo, selectedStrokeIndex, undo])

  const clearCanvas = () => {
    setStrokes([])
    setUndoStack([])
    setRedoStack([])
    setSelectedStrokeIndex(null)
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    renderCanvas(false)
    const link = document.createElement('a')
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}.png`
    link.href = canvas.toDataURL()
    link.click()
    renderCanvas()
  }

  const cursorStyle = useMemo(() => {
    if (tool === 'cursor') {
      return { cursor: isDrawing ? 'grabbing' : 'default' }
    }

    const size = brushSize[0];
    const half = size / 2;
    const svg = `
      <svg width="${size + 2}" height="${size + 2}" viewBox="0 0 ${size + 2} ${size + 2}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${half + 1}" cy="${half + 1}" r="${half}" fill="none" stroke="black" stroke-width="1" />
        <circle cx="${half + 1}" cy="${half + 1}" r="${half - 1}" fill="none" stroke="white" stroke-width="1" />
      </svg>
    `;
    const encoded = encodeURIComponent(svg);
    return { cursor: `url("data:image/svg+xml,${encoded}") ${half + 1} ${half + 1}, auto` };
  }, [brushSize, isDrawing, tool]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Canvas Area */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <div
          ref={containerRef}
          className="relative h-[calc(100vh-2rem)] w-full overflow-hidden rounded-2xl border border-border/50 shadow-lg"
          style={{ ...cursorStyle, backgroundColor: canvasColor }}
        >
          <DropdownMenu
            contextMenuPoint={contextMenu}
            onContextMenuClose={() => setContextMenu(null)}
            trigger={
              <canvas
                ref={canvasRef}
                onContextMenu={openContextMenu}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute top-0 left-0 touch-none"
              />
            }
          >
            <DropdownMenuItem disabled={contextMenu?.strokeIndex == null} onClick={copyContextStroke}>
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem disabled={contextMenu?.strokeIndex == null} onClick={cutContextStroke}>
              Cut
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!clipboardStroke} onClick={pasteContextStroke}>
              Paste
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={contextMenu?.strokeIndex == null}
              variant="destructive"
              onClick={() => deleteStroke(contextMenu?.strokeIndex ?? null)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      {/* Sidebar */}
      <Card className="m-4 flex h-[calc(100vh-2rem)] w-64 shrink-0 flex-col gap-4 rounded-2xl border border-border bg-card/88 p-4 shadow-lg backdrop-blur-xl z-10">
        <div className="space-y-4">
            <div className="flex flex-col gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="self-start -ml-2 text-muted-foreground shadow-none bg-transparent">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Home
                </Button>
                <Input
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                  className="h-8 font-semibold bg-transparent border-0 shadow-none"
                />
            </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Tools</h2>
          <div className="relative flex p-1 rounded-lg bg-muted/50">
            {/* Animated slider background */}
            <div
              className="absolute left-1 top-1 bottom-1 bg-background rounded-md shadow-sm transition-transform duration-300 ease-out"
              style={{
                width: 'calc(33.333333% - 0.333333rem)',
                transform: tool === 'cursor'
                  ? 'translateX(0)'
                  : tool === 'pen'
                    ? 'translateX(calc(100% + 0.25rem))'
                    : 'translateX(calc(200% + 0.5rem))'
              }}
            />
            <div className="grid grid-cols-3 w-full gap-1 relative z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTool('cursor')}
                  aria-pressed={tool === 'cursor'}
                  className={`px-1 text-xs bg-transparent shadow-none hover:bg-transparent dark:hover:bg-transparent ${tool === 'cursor' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <MousePointer2 className="h-4 w-4" /> Cursor
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTool('pen')
                    setBrushSize([penSize])
                    setSelectedStrokeIndex(null)
                  }}
                  aria-pressed={tool === 'pen'}
                  className={`px-1 text-xs bg-transparent shadow-none hover:bg-transparent dark:hover:bg-transparent ${tool === 'pen' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Pen className="h-4 w-4" /> Pen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTool('eraser')
                    setBrushSize([eraserSize])
                    setSelectedStrokeIndex(null)
                  }}
                  aria-pressed={tool === 'eraser'}
                  className={`px-1 text-xs bg-transparent shadow-none hover:bg-transparent dark:hover:bg-transparent ${tool === 'eraser' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Eraser className="h-4 w-4" /> Eraser
                </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Color</h2>
          <ColorPicker
            value={effectiveColor}
            onChange={setColor}
            darkCanvas={darkCanvas}
            triggerClassName="w-full bg-transparent shadow-none"
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium">Size</h2>
            <span className="text-xs text-muted-foreground">{brushSize[0]}px</span>
          </div>
          <Slider
            value={brushSize}
            onValueChange={(value) => {
              setBrushSize(value)
              if (tool === 'pen') {
                setPenSize(value[0])
              } else if (tool === 'eraser') {
                setEraserSize(value[0])
              }
            }}
            max={50}
            min={1}
            step={1}
            className="w-full"
            thumbClassName="border-2 border-foreground bg-background shadow-md"
          />
        </div>

        <Separator />

        <div className="space-y-2">
            <h2 className="text-sm font-medium">History</h2>
            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={undo} disabled={undoStack.length === 0} className="shadow-none bg-transparent">
                    <Undo className="h-4 w-4 mr-2" /> Undo
                </Button>
                <Button variant="outline" onClick={redo} disabled={redoStack.length === 0} className="shadow-none bg-transparent">
                    <Redo className="h-4 w-4 mr-2" /> Redo
                </Button>
            </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Actions</h2>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={downloadCanvas} className="w-full justify-center shadow-none bg-transparent">
              <Download className="mr-2 h-4 w-4" />
              Save Image
            </Button>
            <Button variant="outline" onClick={() => setShowClearModal(true)} className="w-full justify-center shadow-none bg-transparent">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Board
            </Button>
          </div>
        </div>
        
        {showSaveStatus && (
          <div className="mt-auto flex h-6 items-center justify-center text-xs text-muted-foreground">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 mr-2" />
                <span>Saved</span>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Clear Board Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={clearCanvas}
        title="Clear Board?"
        description="This will permanently delete all drawings on this board. This action cannot be undone."
        confirmText="Clear Board"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}
