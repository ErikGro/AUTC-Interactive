import { useRef, useState } from 'react'
import type { Circle } from '../lib/geometry'
import { SCENE_WIDTH, SCENE_HEIGHT } from '../lib/scene'
import { OPACITIES, COLORS } from './constants'

export type RefStatus = 'TP' | 'FN'
export type PredStatus = 'TP' | 'FP'

type Props = {
  refs: Circle[]
  preds: Circle[]
  offset: number
  refStatuses?: (RefStatus | null)[]
  predStatuses?: (PredStatus | null)[]
  onPredChange: (id: string, x: number, y: number) => void
}

export const Scene = ({
  refs,
  preds,
  offset,
  refStatuses,
  predStatuses,
  onPredChange,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{
    id: string
    dx: number
    dy: number
  } | null>(null)

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>, c: Circle) => {
    e.stopPropagation()
    const { x, y } = toSvg(e.clientX, e.clientY)
    setDragging({ id: c.id, dx: x - (c.x + offset), dy: y - c.y })
    ;(e.target as SVGCircleElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (!dragging) return
    const { x, y } = toSvg(e.clientX, e.clientY)
    const newX = clamp(x - dragging.dx - offset, 0, SCENE_WIDTH)
    const newY = clamp(y - dragging.dy, 0, SCENE_HEIGHT)
    onPredChange(dragging.id, newX, newY)
  }

  const handlePointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (!dragging) return
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setDragging(null)
  }

  const refOpacity = (i: number) => {
    const s = refStatuses?.[i]
    if (s === 'TP') return OPACITIES.matched
    if (s === 'FN') return OPACITIES.unmatched
    return OPACITIES.default
  }

  const predOpacity = (i: number) => {
    const s = predStatuses?.[i]
    if (s === 'TP') return OPACITIES.matched
    if (s === 'FP') return OPACITIES.unmatched
    return OPACITIES.default
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      className="mb-2 mt-1 w-full h-auto bg-base-100 rounded-lg border border-base-300 select-none touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {refs.map((c, i) => {
        return (
          <circle
            key={c.id}
            cx={c.x}
            cy={c.y}
            r={c.r}
            fill={COLORS.ref}
            fillOpacity={refOpacity(i)}
          />
        )
      })}
      {preds.map((c, i) => {
        return (
          <circle
            key={c.id}
            cx={c.x + offset}
            cy={c.y}
            r={c.r}
            fill={COLORS.pred}
            fillOpacity={predOpacity(i)}
            cursor="grab"
            onPointerDown={(e) => handlePointerDown(e, c)}
          />
        )
      })}
    </svg>
  )
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}
