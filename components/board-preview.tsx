"use client"

import { useEffect, useRef, useState } from 'react'
import { type CanvasElement, type CanvasImage, type CanvasShape } from '@/lib/data-client'
import { useDarkCanvas } from '@/lib/interface-settings'

const LIGHT_CANVAS_COLOR = '#ffffff'
const DARK_CANVAS_COLOR = '#111318'

interface BoardPreviewProps {
  strokes: CanvasElement[]
}

function isCanvasImage(element: CanvasElement): element is CanvasImage {
  return element.type === 'image'
}

function isCanvasShape(element: CanvasElement): element is CanvasShape { return element.type === 'shape' }

function drawShape(ctx: CanvasRenderingContext2D, shape: CanvasShape, canvasColor: string) {
  const left = Math.min(shape.start.x, shape.end.x), top = Math.min(shape.start.y, shape.end.y)
  const width = Math.abs(shape.end.x - shape.start.x), height = Math.abs(shape.end.y - shape.start.y)
  ctx.beginPath()
  if (shape.shape === 'rectangle') ctx.rect(left, top, width, height)
  if (shape.shape === 'circle') ctx.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
  if (shape.shape === 'triangle') { ctx.moveTo(left + width / 2, top); ctx.lineTo(left + width, top + height); ctx.lineTo(left, top + height); ctx.closePath() }
  if (shape.shape === 'line') { ctx.moveTo(shape.start.x, shape.start.y); ctx.lineTo(shape.end.x, shape.end.y) }
  if (shape.fill !== 'transparent' && shape.shape !== 'line') { ctx.fillStyle = shape.fill === 'filled' ? shape.color : canvasColor; ctx.fill() }
  ctx.strokeStyle = shape.color; ctx.lineWidth = shape.size; ctx.stroke()
}

function imageCorners(image: CanvasImage) {
  const centerX = image.x + image.width / 2
  const centerY = image.y + image.height / 2
  const cosine = Math.cos(image.rotation)
  const sine = Math.sin(image.rotation)
  return [
    [-image.width / 2, -image.height / 2],
    [image.width / 2, -image.height / 2],
    [image.width / 2, image.height / 2],
    [-image.width / 2, image.height / 2],
  ].map(([x, y]) => ({
    x: centerX + x * cosine - y * sine,
    y: centerY + x * sine + y * cosine,
  }))
}

export function BoardPreview({ strokes }: BoardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const darkCanvas = useDarkCanvas()
  const canvasColor = darkCanvas ? DARK_CANVAS_COLOR : LIGHT_CANVAS_COLOR

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = dimensions
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    
    ctx.scale(dpr, dpr)
    
    ctx.fillStyle = canvasColor
    ctx.fillRect(0, 0, width, height)

    if (!strokes || strokes.length === 0) {
        // Draw placeholder text if empty
        ctx.fillStyle = darkCanvas ? '#7f8490' : '#9ca3af'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Empty Board', width / 2, height / 2)
        return
    }

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let hasPoints = false

    strokes.forEach(stroke => {
      const points = isCanvasImage(stroke) ? imageCorners(stroke) : isCanvasShape(stroke) ? [stroke.start, stroke.end] : stroke.points
      points.forEach(point => {
        hasPoints = true
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      })
    })

    if (!hasPoints) return

    // Add padding
    const padding = 20
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    
    const safeContentWidth = Math.max(contentWidth, 1)
    const safeContentHeight = Math.max(contentHeight, 1)

    // Calculate scale to fit
    const scaleX = (width - padding * 2) / safeContentWidth
    const scaleY = (height - padding * 2) / safeContentHeight
    const scale = Math.min(scaleX, scaleY)

    // Center the content
    const offsetX = (width - contentWidth * scale) / 2 - minX * scale
    const offsetY = (height - contentHeight * scale) / 2 - minY * scale

    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)

    const imageElements = strokes.filter(isCanvasImage)
    Promise.all(imageElements.map(imageElement => new Promise<[CanvasImage, HTMLImageElement] | null>((resolve) => {
      const image = new Image()
      image.onload = () => resolve([imageElement, image])
      image.onerror = () => resolve(null)
      image.src = imageElement.src
    }))).then(loadedImages => {
      if (cancelled) return
      const images = new Map(loadedImages.flatMap(entry => entry ? [[entry[0].src, entry[1]] as const] : []))
      const ordered = [...strokes].sort((a, b) => Number(!isCanvasShape(a) && !isCanvasImage(a)) - Number(!isCanvasShape(b) && !isCanvasImage(b)))
      ordered.forEach(stroke => {
        if (isCanvasImage(stroke)) {
          const image = images.get(stroke.src)
          if (!image) return
          const centerX = stroke.x + stroke.width / 2
          const centerY = stroke.y + stroke.height / 2
          ctx.save()
          ctx.translate(centerX, centerY)
          ctx.rotate(stroke.rotation)
          ctx.drawImage(image, -stroke.width / 2, -stroke.height / 2, stroke.width, stroke.height)
          ctx.restore()
          return
        }
        if (isCanvasShape(stroke)) {
          drawShape(ctx, stroke, canvasColor)
          return
        }
        if (stroke.points.length < 1) return

        ctx.beginPath()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = stroke.tool === 'eraser' ? canvasColor : stroke.color
        ctx.lineWidth = stroke.size

        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
        }
        ctx.stroke()
      })
      ctx.restore()
    })

    return () => {
      cancelled = true
    }

  }, [strokes, dimensions, canvasColor, darkCanvas])

  return (
    <div ref={containerRef} className="h-full w-full" style={{ backgroundColor: canvasColor }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
