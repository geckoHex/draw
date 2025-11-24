"use client"

import { useEffect, useRef, useState } from 'react'
import { type Stroke } from '@/lib/db'

interface BoardPreviewProps {
  strokes: Stroke[]
}

export function BoardPreview({ strokes }: BoardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

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
    
    // Clear canvas and fill with white (like the actual whiteboard)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    if (!strokes || strokes.length === 0) {
        // Draw placeholder text if empty
        ctx.fillStyle = '#9ca3af' // text-muted-foreground
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
      stroke.points.forEach(point => {
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

    strokes.forEach(stroke => {
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
    })

    ctx.restore()

  }, [strokes, dimensions])

  return (
    <div ref={containerRef} className="w-full h-full bg-white rounded-md overflow-hidden border">
      <canvas ref={canvasRef} />
    </div>
  )
}