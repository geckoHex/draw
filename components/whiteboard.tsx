"use client"

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Circle, Eraser, Minus, PaintBucket, Pen, MousePointer2, RectangleHorizontal, Triangle, Trash2, Download, Undo, Redo, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { ColorPicker } from '@/components/ui/color-picker'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { saveBoard, getBoard, type CanvasElement, type CanvasImage, type CanvasShape, type ShapeFill, type ShapeKind, type Stroke, type Point } from '@/lib/data-client'
import { useRouter } from 'next/navigation'
import { generateBoardName } from '@/lib/name-generator'
import { getSmoothingFactor, usePenSmoothing, useShowSaveStatus } from '@/lib/drawing-settings'
import { useDarkCanvas } from '@/lib/interface-settings'

const LIGHT_CANVAS_COLOR = '#ffffff'
const DARK_CANVAS_COLOR = '#111318'
const CARDINAL_SNAP_THRESHOLD = 5 * Math.PI / 180
const SELECTION_COLOR = '#3b82f6'
const IMAGE_HANDLE_RADIUS = 7
const IMAGE_ROTATION_HANDLE_OFFSET = 30
const MIN_IMAGE_SIZE = 24
const MAX_PASTED_IMAGE_DIMENSION = 2400

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

function isCanvasImage(element: CanvasElement): element is CanvasImage {
  return element.type === 'image'
}

function isCanvasShape(element: CanvasElement): element is CanvasShape {
  return element.type === 'shape'
}

function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const deltaX = point.x - center.x
  const deltaY = point.y - center.y
  return {
    x: center.x + deltaX * cosine - deltaY * sine,
    y: center.y + deltaX * sine + deltaY * cosine
  }
}

function imageCenter(image: CanvasImage): Point {
  return { x: image.x + image.width / 2, y: image.y + image.height / 2 }
}

function toImageLocalPoint(image: CanvasImage, point: Point): Point {
  const center = imageCenter(image)
  const unrotated = rotatePoint(point, center, -image.rotation)
  return { x: unrotated.x - center.x, y: unrotated.y - center.y }
}

function getImageHandlePoints(image: CanvasImage) {
  const center = imageCenter(image)
  const halfWidth = image.width / 2
  const halfHeight = image.height / 2
  const point = (x: number, y: number) => rotatePoint({ x: center.x + x, y: center.y + y }, center, image.rotation)
  return {
    nw: point(-halfWidth, -halfHeight),
    ne: point(halfWidth, -halfHeight),
    se: point(halfWidth, halfHeight),
    sw: point(-halfWidth, halfHeight),
    rotate: point(0, -halfHeight - IMAGE_ROTATION_HANDLE_OFFSET)
  }
}

type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

function hitTestImageHandle(image: CanvasImage, point: Point): ResizeHandle | 'rotate' | null {
  const handles = getImageHandlePoints(image)
  for (const handle of ['rotate', 'nw', 'ne', 'se', 'sw'] as const) {
    const handlePoint = handles[handle]
    if (Math.hypot(point.x - handlePoint.x, point.y - handlePoint.y) <= IMAGE_HANDLE_RADIUS + 14) {
      return handle
    }
  }
  return null
}

function hitTestElement(elements: CanvasElement[], point: Point) {
  for (let strokeIndex = elements.length - 1; strokeIndex >= 0; strokeIndex -= 1) {
    const stroke = elements[strokeIndex]
    if (isCanvasImage(stroke)) {
      const local = toImageLocalPoint(stroke, point)
      if (Math.abs(local.x) <= stroke.width / 2 && Math.abs(local.y) <= stroke.height / 2) {
        return strokeIndex
      }
      continue
    }
    if (isCanvasShape(stroke)) {
      const left = Math.min(stroke.start.x, stroke.end.x) - 8
      const right = Math.max(stroke.start.x, stroke.end.x) + 8
      const top = Math.min(stroke.start.y, stroke.end.y) - 8
      const bottom = Math.max(stroke.start.y, stroke.end.y) + 8
      if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) return strokeIndex
      continue
    }
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

function translateElement(stroke: CanvasElement, offset: Point): CanvasElement {
  if (isCanvasImage(stroke)) {
    return { ...stroke, x: stroke.x + offset.x, y: stroke.y + offset.y }
  }
  if (isCanvasShape(stroke)) {
    return { ...stroke, start: { x: stroke.start.x + offset.x, y: stroke.start.y + offset.y }, end: { x: stroke.end.x + offset.x, y: stroke.end.y + offset.y } }
  }
  return {
    ...stroke,
    points: stroke.points.map(point => ({
      x: point.x + offset.x,
      y: point.y + offset.y
    }))
  }
}

function cloneElement(stroke: CanvasElement): CanvasElement {
  if (isCanvasImage(stroke)) return { ...stroke }
  if (isCanvasShape(stroke)) return { ...stroke, start: { ...stroke.start }, end: { ...stroke.end } }
  return {
    ...stroke,
    points: stroke.points.map(point => ({ ...point }))
  }
}

async function normalizePastedImage(file: File) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image()
      candidate.onload = () => resolve(candidate)
      candidate.onerror = () => reject(new Error('The pasted image could not be decoded.'))
      candidate.src = objectUrl
    })
    const scale = Math.min(1, MAX_PASTED_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('The pasted image could not be processed.')
    context.drawImage(image, 0, 0, width, height)
    return { src: canvas.toDataURL('image/webp', 0.9), width, height }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

type Tool = 'cursor' | 'pen' | 'eraser' | 'shape' | 'bucket'

type CanvasAction =
  | { type: 'add'; index: number; stroke: CanvasElement }
  | { type: 'delete'; index: number; stroke: CanvasElement }
  | { type: 'transform'; index: number; before: CanvasElement; after: CanvasElement }

interface CanvasContextMenu {
  x: number
  y: number
  strokeIndex: number | null
}

function applyCanvasAction(strokes: CanvasElement[], action: CanvasAction, direction: 'undo' | 'redo') {
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
  const draggedStrokeRef = useRef<CanvasElement | null>(null)
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 })
  const transformModeRef = useRef<'move' | 'resize' | 'rotate'>('move')
  const resizeHandleRef = useRef<ResizeHandle | null>(null)
  const transformPreviewRef = useRef<CanvasElement | null>(null)
  const copiedStrokeRef = useRef<CanvasElement | null>(null)
  const internalCopyActiveRef = useRef(false)
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>())
  const renderCanvasRef = useRef<(includeSelection?: boolean) => void>(() => {})
  const canvasElementsRef = useRef<CanvasElement[]>([])
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<Tool>('pen')
  const [brushSize, setBrushSize] = useState([5])
  const [penSize, setPenSize] = useState(5)
  const [eraserSize, setEraserSize] = useState(20)
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rectangle')
  const [shapeFill, setShapeFill] = useState<ShapeFill>('transparent')
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
  
  const [strokes, setStrokes] = useState<CanvasElement[]>([])
  const [undoStack, setUndoStack] = useState<CanvasAction[]>([])
  const [redoStack, setRedoStack] = useState<CanvasAction[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [currentShape, setCurrentShape] = useState<CanvasShape | null>(null)
  const [selectedStrokeIndex, setSelectedStrokeIndex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  const [transformPreview, setTransformPreview] = useState<CanvasElement | null>(null)
  const [contextMenu, setContextMenu] = useState<CanvasContextMenu | null>(null)
  const [hasCopiedStroke, setHasCopiedStroke] = useState(false)
  
  const [showClearModal, setShowClearModal] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    canvasElementsRef.current = strokes
  }, [strokes])

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

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, image: CanvasImage) => {
    let bitmap = imageCacheRef.current.get(image.src)
    if (!bitmap) {
      bitmap = new Image()
      bitmap.onload = () => renderCanvasRef.current()
      bitmap.src = image.src
      imageCacheRef.current.set(image.src, bitmap)
    }
    if (!bitmap.complete || bitmap.naturalWidth === 0) return

    const center = imageCenter(image)
    ctx.save()
    ctx.translate(center.x, center.y)
    ctx.rotate(image.rotation)
    ctx.drawImage(bitmap, -image.width / 2, -image.height / 2, image.width, image.height)
    ctx.restore()
  }, [])

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: CanvasShape) => {
    const left = Math.min(shape.start.x, shape.end.x)
    const top = Math.min(shape.start.y, shape.end.y)
    const width = Math.abs(shape.end.x - shape.start.x)
    const height = Math.abs(shape.end.y - shape.start.y)
    ctx.save()
    ctx.beginPath()
    if (shape.shape === 'rectangle') ctx.rect(left, top, width, height)
    if (shape.shape === 'circle') ctx.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
    if (shape.shape === 'triangle') {
      ctx.moveTo(left + width / 2, top)
      ctx.lineTo(left + width, top + height)
      ctx.lineTo(left, top + height)
      ctx.closePath()
    }
    if (shape.shape === 'line') {
      ctx.moveTo(shape.start.x, shape.start.y)
      ctx.lineTo(shape.end.x, shape.end.y)
    }
    if (shape.fill !== 'transparent' && shape.shape !== 'line') {
      ctx.fillStyle = shape.fill === 'filled' ? shape.color : canvasColor
      ctx.fill()
    }
    ctx.strokeStyle = shape.color
    ctx.lineWidth = shape.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.restore()
  }, [canvasColor])

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement, offset: Point = { x: 0, y: 0 }) => {
    if (isCanvasImage(element)) {
      drawImage(ctx, offset.x || offset.y ? translateElement(element, offset) as CanvasImage : element)
    } else if (isCanvasShape(element)) {
      drawShape(ctx, offset.x || offset.y ? translateElement(element, offset) as CanvasShape : element)
    } else {
      drawStroke(ctx, element, offset.x, offset.y)
    }
  }, [drawImage, drawShape, drawStroke])

  const drawStrokeSelection = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, offset: Point) => {
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

  const drawImageSelection = useCallback((ctx: CanvasRenderingContext2D, image: CanvasImage) => {
    const center = imageCenter(image)
    const handles = getImageHandlePoints(image)
    const topCenter = rotatePoint(
      { x: center.x, y: image.y },
      center,
      image.rotation
    )

    ctx.save()
    ctx.strokeStyle = SELECTION_COLOR
    ctx.fillStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.save()
    ctx.translate(center.x, center.y)
    ctx.rotate(image.rotation)
    ctx.strokeRect(-image.width / 2, -image.height / 2, image.width, image.height)
    ctx.restore()

    ctx.beginPath()
    ctx.moveTo(topCenter.x, topCenter.y)
    ctx.lineTo(handles.rotate.x, handles.rotate.y)
    ctx.stroke()

    for (const point of Object.values(handles)) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, IMAGE_HANDLE_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }, [])

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

    // Draw all saved canvas elements.
    const orderedElements = strokes.map((element, index) => ({ element, index }))
      .sort((a, b) => Number(!isCanvasShape(a.element) && !isCanvasImage(a.element)) - Number(!isCanvasShape(b.element) && !isCanvasImage(b.element)))
    orderedElements.forEach(({ element: stroke, index }) => {
      if (index === selectedStrokeIndex && isDrawing && tool === 'cursor') {
        if (transformPreview) {
          drawElement(ctx, transformPreview)
        } else {
          drawElement(ctx, stroke, dragOffset)
        }
      } else {
        drawElement(ctx, stroke)
      }
    })

    // Draw current stroke
    if (currentStroke) {
      drawStroke(ctx, currentStroke)
    }
    if (currentShape) drawShape(ctx, currentShape)

    if (includeSelection && selectedStrokeIndex !== null) {
      const selectedStroke = strokes[selectedStrokeIndex]
      if (selectedStroke) {
        if (isCanvasImage(selectedStroke)) {
          const selectedPreview = isDrawing && tool === 'cursor'
            ? transformPreview && isCanvasImage(transformPreview)
              ? transformPreview
              : translateElement(selectedStroke, dragOffset) as CanvasImage
            : selectedStroke
          drawImageSelection(ctx, selectedPreview)
        } else if (isCanvasShape(selectedStroke)) {
          const offset = isDrawing && tool === 'cursor' ? dragOffset : { x: 0, y: 0 }
          ctx.save()
          ctx.shadowColor = SELECTION_COLOR
          ctx.shadowBlur = 6
          drawShape(ctx, translateElement(selectedStroke, offset) as CanvasShape)
          ctx.restore()
        } else {
          const offset = isDrawing && tool === 'cursor' ? dragOffset : { x: 0, y: 0 }
          drawStrokeSelection(ctx, selectedStroke, offset)
        }
      }
    }
  }, [strokes, currentStroke, currentShape, canvasColor, drawElement, drawImageSelection, drawShape, drawStroke, drawStrokeSelection, selectedStrokeIndex, isDrawing, tool, dragOffset, transformPreview])

  useEffect(() => {
    renderCanvasRef.current = renderCanvas
  }, [renderCanvas])

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
    if ('button' in e && e.button !== 0) return

    e.preventDefault()
    setContextMenu(null)
    const coords = getCoordinates(e)
    if (!coords) return

    if (tool === 'bucket') {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const dpr = window.devicePixelRatio || 1
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(coords.x * dpr)))
      const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(coords.y * dpr)))
      const start = (y * canvas.width + x) * 4
      const target = Array.from(image.data.slice(start, start + 4))
      const fill = effectiveColor.match(/[a-f\d]{2}/gi)?.map(value => parseInt(value, 16)) ?? [0, 0, 0]
      const tolerance = 45
      if (Math.abs(target[0] - fill[0]) + Math.abs(target[1] - fill[1]) + Math.abs(target[2] - fill[2]) > 6) {
        const stack = [x, y]
        const visited = new Uint8Array(canvas.width * canvas.height)
        while (stack.length) {
          const cy = stack.pop()!
          const cx = stack.pop()!
          const pixel = cy * canvas.width + cx
          if (visited[pixel]) continue
          visited[pixel] = 1
          const offset = pixel * 4
          const difference = Math.abs(image.data[offset] - target[0]) + Math.abs(image.data[offset + 1] - target[1]) + Math.abs(image.data[offset + 2] - target[2])
          if (difference > tolerance) continue
          image.data[offset] = fill[0]; image.data[offset + 1] = fill[1]; image.data[offset + 2] = fill[2]; image.data[offset + 3] = 255
          if (cx > 0) stack.push(cx - 1, cy)
          if (cx + 1 < canvas.width) stack.push(cx + 1, cy)
          if (cy > 0) stack.push(cx, cy - 1)
          if (cy + 1 < canvas.height) stack.push(cx, cy + 1)
        }
        ctx.putImageData(image, 0, 0)
        const bucketLayer: CanvasImage = { type: 'image', src: canvas.toDataURL('image/png'), x: 0, y: 0, width: canvas.width / dpr, height: canvas.height / dpr, rotation: 0 }
        const index = strokes.length
        setStrokes(previous => [...previous, bucketLayer])
        setUndoStack(previous => [...previous, { type: 'add', index, stroke: bucketLayer }])
        setRedoStack([])
      }
      return
    }

    if (tool === 'cursor') {
      const selectedElement = selectedStrokeIndex === null ? null : strokes[selectedStrokeIndex]
      const imageHandle = selectedElement && isCanvasImage(selectedElement)
        ? hitTestImageHandle(selectedElement, coords)
        : null
      const strokeIndex = imageHandle ? selectedStrokeIndex : hitTestElement(strokes, coords)
      setSelectedStrokeIndex(strokeIndex)
      setCurrentStroke(null)

      if (strokeIndex === null) {
        setIsDrawing(false)
        draggedStrokeIndexRef.current = null
        dragStartRef.current = null
        draggedStrokeRef.current = null
        dragOffsetRef.current = { x: 0, y: 0 }
        setDragOffset({ x: 0, y: 0 })
        transformPreviewRef.current = null
        setTransformPreview(null)
        return
      }

      setIsDrawing(true)
      draggedStrokeIndexRef.current = strokeIndex
      dragStartRef.current = coords
      draggedStrokeRef.current = strokes[strokeIndex]
      transformModeRef.current = imageHandle === 'rotate'
        ? 'rotate'
        : imageHandle
          ? 'resize'
          : 'move'
      resizeHandleRef.current = imageHandle && imageHandle !== 'rotate' ? imageHandle : null
      dragOffsetRef.current = { x: 0, y: 0 }
      setDragOffset({ x: 0, y: 0 })
      transformPreviewRef.current = null
      setTransformPreview(null)
      return
    }

    if (tool === 'shape') {
      setIsDrawing(true)
      setCurrentShape({ type: 'shape', shape: shapeKind, start: coords, end: coords, color: effectiveColor, size: brushSize[0], fill: shapeFill })
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
      const originalElement = draggedStrokeRef.current
      if (!dragStart || !originalElement || draggedStrokeIndexRef.current === null) return

      if (isCanvasImage(originalElement) && transformModeRef.current === 'rotate') {
        const center = imageCenter(originalElement)
        const nextImage = {
          ...originalElement,
          rotation: Math.atan2(coords.y - center.y, coords.x - center.x) + Math.PI / 2
        }
        transformPreviewRef.current = nextImage
        setTransformPreview(nextImage)
        return
      }

      if (isCanvasImage(originalElement) && transformModeRef.current === 'resize') {
        const handle = resizeHandleRef.current
        if (!handle) return
        const signs = {
          nw: { x: -1, y: -1 }, ne: { x: 1, y: -1 },
          se: { x: 1, y: 1 }, sw: { x: -1, y: 1 }
        }[handle]
        const originalCenter = imageCenter(originalElement)
        const oppositeLocal = {
          x: -signs.x * originalElement.width / 2,
          y: -signs.y * originalElement.height / 2
        }
        const opposite = rotatePoint({
          x: originalCenter.x + oppositeLocal.x,
          y: originalCenter.y + oppositeLocal.y
        }, originalCenter, originalElement.rotation)
        const pointerLocal = rotatePoint(coords, opposite, -originalElement.rotation)
        const width = Math.max(MIN_IMAGE_SIZE, signs.x * (pointerLocal.x - opposite.x))
        const height = Math.max(MIN_IMAGE_SIZE, signs.y * (pointerLocal.y - opposite.y))
        const nextCenterLocal = {
          x: opposite.x + signs.x * width / 2,
          y: opposite.y + signs.y * height / 2
        }
        const nextCenter = rotatePoint(nextCenterLocal, opposite, originalElement.rotation)
        const nextImage = {
          ...originalElement,
          x: nextCenter.x - width / 2,
          y: nextCenter.y - height / 2,
          width,
          height
        }
        transformPreviewRef.current = nextImage
        setTransformPreview(nextImage)
        return
      }

      const nextOffset = {
        x: coords.x - dragStart.x,
        y: coords.y - dragStart.y
      }
      dragOffsetRef.current = nextOffset
      setDragOffset(nextOffset)
      return
    }

    if (tool === 'shape' && currentShape) {
      let end = coords
      const shift = 'shiftKey' in e && e.shiftKey
      if (shift && shapeKind === 'line') {
        const dx = coords.x - currentShape.start.x
        const dy = coords.y - currentShape.start.y
        end = Math.abs(dx) >= Math.abs(dy) ? { x: coords.x, y: currentShape.start.y } : { x: currentShape.start.x, y: coords.y }
      } else if (shift) {
        const dx = coords.x - currentShape.start.x
        const dy = coords.y - currentShape.start.y
        const side = Math.max(Math.abs(dx), Math.abs(dy))
        end = { x: currentShape.start.x + Math.sign(dx || 1) * side, y: currentShape.start.y + Math.sign(dy || 1) * side }
      }
      setCurrentShape(previous => previous ? { ...previous, end } : null)
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
      const preview = transformPreviewRef.current
      const transformedStroke = preview ?? (originalStroke ? translateElement(originalStroke, offset) : null)
      const hasChanged = Boolean(originalStroke && transformedStroke && (
        preview || offset.x !== 0 || offset.y !== 0
      ))

      setIsDrawing(false)
      dragStartRef.current = null
      draggedStrokeIndexRef.current = null
      draggedStrokeRef.current = null
      resizeHandleRef.current = null
      dragOffsetRef.current = { x: 0, y: 0 }
      setDragOffset({ x: 0, y: 0 })
      transformPreviewRef.current = null
      setTransformPreview(null)

      if (strokeIndex !== null && originalStroke && transformedStroke && hasChanged) {
        setStrokes(prev => prev.map((stroke, index) => index === strokeIndex ? transformedStroke : stroke))
        setUndoStack(prev => [...prev, {
          type: 'transform',
          index: strokeIndex,
          before: originalStroke,
          after: transformedStroke
        }])
        setRedoStack([])
      }
      return
    }

    if (tool === 'shape' && currentShape) {
      setIsDrawing(false)
      const index = strokes.length
      setStrokes(previous => [...previous, currentShape])
      setUndoStack(previous => [...previous, { type: 'add', index, stroke: currentShape }])
      setRedoStack([])
      setCurrentShape(null)
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

  const deleteStroke = useCallback((strokeIndex: number) => {
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
    setContextMenu(null)
  }, [strokes])

  const deleteSelectedStroke = useCallback(() => {
    if (selectedStrokeIndex === null) return
    deleteStroke(selectedStrokeIndex)
  }, [deleteStroke, selectedStrokeIndex])

  const copyStroke = useCallback((strokeIndex: number) => {
    const stroke = strokes[strokeIndex]
    if (!stroke) return

    copiedStrokeRef.current = cloneElement(stroke)
    internalCopyActiveRef.current = true
    setHasCopiedStroke(true)
    setContextMenu(null)
  }, [strokes])

  const cutStroke = useCallback((strokeIndex: number) => {
    const stroke = strokes[strokeIndex]
    if (!stroke) return

    copiedStrokeRef.current = cloneElement(stroke)
    internalCopyActiveRef.current = true
    setHasCopiedStroke(true)
    deleteStroke(strokeIndex)
  }, [deleteStroke, strokes])

  const pasteStroke = useCallback(() => {
    const copiedStroke = copiedStrokeRef.current
    if (!copiedStroke) return

    const pastedStroke = translateElement(copiedStroke, { x: 16, y: 16 })
    const strokeIndex = strokes.length
    copiedStrokeRef.current = cloneElement(pastedStroke)
    setStrokes(prev => [...prev, pastedStroke])
    setUndoStack(prev => [...prev, { type: 'add', index: strokeIndex, stroke: pastedStroke }])
    setRedoStack([])
    setSelectedStrokeIndex(strokeIndex)
    setContextMenu(null)
  }, [strokes.length])

  const pasteImage = useCallback(async (file: File) => {
    try {
      const normalized = await normalizePastedImage(file)
      const container = containerRef.current
      if (!container) return
      const bounds = container.getBoundingClientRect()
      const displayScale = Math.min(
        1,
        (bounds.width * 0.6) / normalized.width,
        (bounds.height * 0.6) / normalized.height
      )
      const image: CanvasImage = {
        type: 'image',
        src: normalized.src,
        width: normalized.width * displayScale,
        height: normalized.height * displayScale,
        x: (bounds.width - normalized.width * displayScale) / 2,
        y: (bounds.height - normalized.height * displayScale) / 2,
        rotation: 0
      }
      const imageIndex = canvasElementsRef.current.length
      const nextElements = [...canvasElementsRef.current, image]
      canvasElementsRef.current = nextElements
      setStrokes(nextElements)
      setUndoStack(previous => [...previous, { type: 'add', index: imageIndex, stroke: image }])
      setRedoStack([])
      setSelectedStrokeIndex(imageIndex)
      setTool('cursor')
      setContextMenu(null)
    } catch (error) {
      console.error('Failed to paste image:', error)
    }
  }, [])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

      if (internalCopyActiveRef.current && copiedStrokeRef.current) {
        event.preventDefault()
        pasteStroke()
        return
      }

      const imageItem = Array.from(event.clipboardData?.items ?? [])
        .find(item => item.kind === 'file' && item.type.startsWith('image/'))
      const imageFile = imageItem?.getAsFile()
      if (imageFile) {
        event.preventDefault()
        void pasteImage(imageFile)
      }
    }

    const resetInternalCopy = () => {
      internalCopyActiveRef.current = false
    }

    window.addEventListener('paste', handlePaste)
    window.addEventListener('blur', resetInternalCopy)
    return () => {
      window.removeEventListener('paste', handlePaste)
      window.removeEventListener('blur', resetInternalCopy)
    }
  }, [pasteImage, pasteStroke])

  const openContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const coords = getCoordinates(event)
    if (!coords) return

    const strokeIndex = hitTestElement(strokes, coords)
    setSelectedStrokeIndex(strokeIndex)

    const menuWidth = 160
    const menuHeight = 160
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
      strokeIndex
    })
  }

  useEffect(() => {
    if (!contextMenu) return

    const closeContextMenu = (event: PointerEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) return
      setContextMenu(null)
    }
    const closeOnViewportChange = () => setContextMenu(null)

    window.addEventListener('pointerdown', closeContextMenu)
    window.addEventListener('resize', closeOnViewportChange)
    window.addEventListener('blur', closeOnViewportChange)
    return () => {
      window.removeEventListener('pointerdown', closeContextMenu)
      window.removeEventListener('resize', closeOnViewportChange)
      window.removeEventListener('blur', closeOnViewportChange)
    }
  }, [contextMenu])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditingText = target?.isContentEditable
        || target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'

      if (isEditingText) return

      if (event.key === 'Escape' && contextMenu) {
        event.preventDefault()
        setContextMenu(null)
        return
      }

      if (event.metaKey && selectedStrokeIndex !== null) {
        const key = event.key.toLowerCase()
        if (key === 'c') {
          event.preventDefault()
          copyStroke(selectedStrokeIndex)
          return
        }
        if (key === 'x') {
          event.preventDefault()
          cutStroke(selectedStrokeIndex)
          return
        }
      }

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
  }, [contextMenu, copyStroke, cutStroke, deleteSelectedStroke, redo, selectedStrokeIndex, undo])

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
          onContextMenuCapture={openContextMenu}
        >
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

      {contextMenu && (
        <div
          ref={contextMenuRef}
          role="menu"
          aria-label="Drawing actions"
          className="fixed z-50 w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={event => event.preventDefault()}
        >
          <button
            type="button"
            role="menuitem"
            disabled={contextMenu.strokeIndex === null}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-50"
            onClick={() => {
              if (contextMenu.strokeIndex !== null) copyStroke(contextMenu.strokeIndex)
            }}
          >
            Copy
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={contextMenu.strokeIndex === null}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-50"
            onClick={() => {
              if (contextMenu.strokeIndex !== null) cutStroke(contextMenu.strokeIndex)
            }}
          >
            Cut
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!hasCopiedStroke}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-50"
            onClick={pasteStroke}
          >
            Paste
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={contextMenu.strokeIndex === null}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-50"
            onClick={() => {
              if (contextMenu.strokeIndex !== null) deleteStroke(contextMenu.strokeIndex)
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Sidebar */}
      <Card className="m-4 flex h-[calc(100vh-2rem)] w-64 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card/88 p-4 shadow-lg backdrop-blur-xl z-10">
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
          <h2 className="text-sm font-medium">Modes</h2>
          <div className="flex p-1 rounded-lg bg-muted/50">
            <div className="grid grid-cols-4 w-full gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTool('cursor')}
                  aria-pressed={tool === 'cursor'}
                  className={`px-1 text-xs shadow-none ${tool === 'cursor' ? 'bg-background text-foreground' : 'bg-transparent text-muted-foreground'}`}
                >
                    <MousePointer2 className="h-4 w-4" /> Select
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
                  className={`px-1 text-xs shadow-none ${tool === 'pen' ? 'bg-background text-foreground' : 'bg-transparent text-muted-foreground'}`}
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
                  className={`px-1 text-xs shadow-none ${tool === 'eraser' ? 'bg-background text-foreground' : 'bg-transparent text-muted-foreground'}`}
                >
                    <Eraser className="h-4 w-4" /> Eraser
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setTool('bucket'); setSelectedStrokeIndex(null) }} aria-pressed={tool === 'bucket'} title="Paint bucket" className={`px-1 text-xs shadow-none ${tool === 'bucket' ? 'bg-background text-foreground' : 'bg-transparent text-muted-foreground'}`}>
                  <PaintBucket className="h-4 w-4" /> Fill
                </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Drawing tools</h2>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted/50 p-1">
            {([
              ['rectangle', RectangleHorizontal], ['circle', Circle], ['triangle', Triangle], ['line', Minus],
            ] as const).map(([kind, Icon]) => (
              <Button key={kind} variant="ghost" size="icon" title={kind[0].toUpperCase() + kind.slice(1)} aria-label={kind} aria-pressed={tool === 'shape' && shapeKind === kind} onClick={() => { setShapeKind(kind); setTool('shape'); setSelectedStrokeIndex(null) }} className={`h-8 w-full shadow-none ${tool === 'shape' && shapeKind === kind ? 'bg-background text-foreground' : 'bg-transparent text-muted-foreground'}`}>
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(['transparent', 'opaque', 'filled'] as ShapeFill[]).map(fill => (
              <Button key={fill} variant={shapeFill === fill ? 'secondary' : 'ghost'} size="sm" onClick={() => setShapeFill(fill)} className="h-8 px-1 text-xs capitalize shadow-none">{fill}</Button>
            ))}
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
