import { useEffect, useRef, useState } from 'react'
import type { Circle } from '../lib/geometry'
import {
  EDGE_BAND,
  NEW_CIRCLE_R,
  R_MAX,
  R_MIN,
  SCENE_HEIGHT,
  SCENE_WIDTH,
} from '../lib/scene'
import { COLORS, OPACITIES } from './constants'

export type RefStatus = 'TP' | 'FN'
export type PredStatus = 'TP' | 'FP'
export type CircleGroup = 'ref' | 'pred'

type Hover =
  | { kind: 'none' }
  | { kind: 'empty'; x: number; y: number }
  | { kind: 'circle'; group: CircleGroup; idx: number; zone: 'interior' | 'edge' }

type Active =
  | { kind: 'idle' }
  | {
      kind: 'drag'
      group: CircleGroup
      idx: number
      op: 'move' | 'resize'
      dx: number
      dy: number
    }
  | { kind: 'add-pending'; x: number; y: number }

type Props = {
  refs: Circle[]
  preds: Circle[]
  offset: number
  refStatuses?: (RefStatus | null)[]
  predStatuses?: (PredStatus | null)[]
  onRefsChange: (refs: Circle[]) => void
  onPredsChange: (preds: Circle[]) => void
  onDraggingChange?: (dragging: boolean) => void
}

const X_BUTTON_HIT_R = 12
const X_BUTTON_OUT = 4

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

const xButtonOffset = (r: number) => (r + X_BUTTON_OUT) / Math.SQRT2

export const Scene = ({
  refs,
  preds,
  offset,
  refStatuses,
  predStatuses,
  onRefsChange,
  onPredsChange,
  onDraggingChange,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<Hover>({ kind: 'none' })
  const [active, setActive] = useState<Active>({ kind: 'idle' })

  useEffect(() => {
    if (active.kind !== 'add-pending') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive({ kind: 'idle' })
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [active.kind])

  const visualX = (c: Circle, group: CircleGroup) =>
    c.x + (group === 'pred' ? offset : 0)

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

  const hitTest = (x: number, y: number) => {
    for (let i = preds.length - 1; i >= 0; i--) {
      const c = preds[i]
      if (Math.hypot(x - visualX(c, 'pred'), y - c.y) <= c.r) {
        return { group: 'pred' as const, idx: i, circle: c }
      }
    }
    for (let i = refs.length - 1; i >= 0; i--) {
      const c = refs[i]
      if (Math.hypot(x - c.x, y - c.y) <= c.r) {
        return { group: 'ref' as const, idx: i, circle: c }
      }
    }
    return null
  }

  const xButtonPosFor = (c: Circle, group: CircleGroup) => {
    const off = xButtonOffset(c.r)
    return { x: visualX(c, group) + off, y: c.y - off }
  }

  const cursorOverHoveredX = (x: number, y: number): boolean => {
    if (hover.kind !== 'circle') return false
    const arr = hover.group === 'pred' ? preds : refs
    const c = arr[hover.idx]
    if (!c) return false
    const xp = xButtonPosFor(c, hover.group)
    return Math.hypot(x - xp.x, y - xp.y) < X_BUTTON_HIT_R
  }

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = toSvg(e.clientX, e.clientY)

    if (active.kind === 'add-pending') {
      setActive({ kind: 'idle' })
      return
    }
    if (active.kind !== 'idle') return

    const hit = hitTest(x, y)
    if (hit === null) {
      setActive({ kind: 'add-pending', x, y })
      return
    }

    const cx = visualX(hit.circle, hit.group)
    const dist = Math.hypot(x - cx, y - hit.circle.y)
    const op: 'move' | 'resize' =
      dist > hit.circle.r - EDGE_BAND ? 'resize' : 'move'

    svgRef.current?.setPointerCapture(e.pointerId)
    onDraggingChange?.(true)
    setActive({
      kind: 'drag',
      group: hit.group,
      idx: hit.idx,
      op,
      dx: x - cx,
      dy: y - hit.circle.y,
    })
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = toSvg(e.clientX, e.clientY)

    if (active.kind === 'drag') {
      const arr = active.group === 'pred' ? preds : refs
      const c = arr[active.idx]
      if (!c) return
      if (active.op === 'move') {
        const groupOffset = active.group === 'pred' ? offset : 0
        const newX = clamp(x - active.dx - groupOffset, 0, SCENE_WIDTH)
        const newY = clamp(y - active.dy, 0, SCENE_HEIGHT)
        const next = arr.map((cc, i) =>
          i === active.idx ? { ...cc, x: newX, y: newY } : cc,
        )
        if (active.group === 'pred') onPredsChange(next)
        else onRefsChange(next)
      } else {
        const cx = visualX(c, active.group)
        const newR = clamp(Math.hypot(x - cx, y - c.y), R_MIN, R_MAX)
        const next = arr.map((cc, i) =>
          i === active.idx ? { ...cc, r: newR } : cc,
        )
        if (active.group === 'pred') onPredsChange(next)
        else onRefsChange(next)
      }
      return
    }

    if (active.kind === 'add-pending') return

    if (cursorOverHoveredX(x, y)) return

    const hit = hitTest(x, y)
    if (hit === null) {
      if (hover.kind !== 'empty' || hover.x !== x || hover.y !== y) {
        setHover({ kind: 'empty', x, y })
      }
      return
    }

    const cx = visualX(hit.circle, hit.group)
    const dist = Math.hypot(x - cx, y - hit.circle.y)
    const zone: 'interior' | 'edge' =
      dist > hit.circle.r - EDGE_BAND ? 'edge' : 'interior'
    if (
      hover.kind !== 'circle' ||
      hover.group !== hit.group ||
      hover.idx !== hit.idx ||
      hover.zone !== zone
    ) {
      setHover({ kind: 'circle', group: hit.group, idx: hit.idx, zone })
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (active.kind === 'drag') {
      svgRef.current?.releasePointerCapture?.(e.pointerId)
      setActive({ kind: 'idle' })
      onDraggingChange?.(false)
    }
  }

  const handlePointerLeave = () => {
    if (active.kind === 'drag') return
    setHover({ kind: 'none' })
  }

  const handleRemove = (group: CircleGroup, idx: number) => {
    if (group === 'pred') onPredsChange(preds.filter((_, i) => i !== idx))
    else onRefsChange(refs.filter((_, i) => i !== idx))
    setHover({ kind: 'none' })
  }

  const handleAdd = (group: CircleGroup, x: number, y: number) => {
    const baseX = group === 'pred' ? x - offset : x
    const newCircle: Circle = { x: baseX, y, r: NEW_CIRCLE_R }
    if (group === 'pred') onPredsChange([...preds, newCircle])
    else onRefsChange([...refs, newCircle])
    setActive({ kind: 'idle' })
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

  const cursor = (() => {
    if (active.kind === 'drag')
      return active.op === 'resize' ? 'nwse-resize' : 'grabbing'
    if (active.kind === 'add-pending') return 'default'
    if (hover.kind === 'circle')
      return hover.zone === 'edge' ? 'nwse-resize' : 'grab'
    if (hover.kind === 'empty') return 'pointer'
    return 'default'
  })()

  const showOverlays = active.kind === 'idle'
  const hoveredCircle =
    hover.kind === 'circle'
      ? (hover.group === 'pred' ? preds : refs)[hover.idx]
      : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      className="mb-2 mt-1 w-full h-auto bg-base-100 rounded-lg border border-base-300 select-none touch-none"
      style={{ cursor }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {refs.map((c, i) => (
        <circle
          key={`r-${i}`}
          cx={c.x}
          cy={c.y}
          r={c.r}
          fill={COLORS.ref}
          fillOpacity={refOpacity(i)}
          pointerEvents="none"
        />
      ))}
      {preds.map((c, i) => (
        <circle
          key={`p-${i}`}
          cx={c.x + offset}
          cy={c.y}
          r={c.r}
          fill={COLORS.pred}
          fillOpacity={predOpacity(i)}
          pointerEvents="none"
        />
      ))}

      {showOverlays && hover.kind === 'circle' && hoveredCircle && (
        <RemoveButton
          x={xButtonPosFor(hoveredCircle, hover.group).x}
          y={xButtonPosFor(hoveredCircle, hover.group).y}
          onClick={() => handleRemove(hover.group, hover.idx)}
        />
      )}

      {showOverlays && hover.kind === 'empty' && (
        <AddIcon x={hover.x} y={hover.y} />
      )}

      {active.kind === 'add-pending' && (
        <AddPicker
          x={active.x}
          y={active.y}
          onPick={(group) => handleAdd(group, active.x, active.y)}
        />
      )}
    </svg>
  )
}

const RemoveButton = ({
  x,
  y,
  onClick,
}: {
  x: number
  y: number
  onClick: () => void
}) => (
  <g
    transform={`translate(${x}, ${y})`}
    style={{ cursor: 'pointer' }}
    onPointerDown={(e) => {
      e.stopPropagation()
      onClick()
    }}
  >
    <circle r={9} fill="white" fillOpacity={0.7} stroke="#475569" strokeWidth={1.2} />
    <line x1={-3.5} y1={-3.5} x2={3.5} y2={3.5} stroke="#475569" strokeWidth={1.6} strokeLinecap="round" />
    <line x1={-3.5} y1={3.5} x2={3.5} y2={-3.5} stroke="#475569" strokeWidth={1.6} strokeLinecap="round" />
  </g>
)

const AddIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x}, ${y})`} pointerEvents="none">
    <circle r={11} fill="white" fillOpacity={0.7} stroke="#475569" strokeWidth={1.2} />
    <line x1={-5} y1={0} x2={5} y2={0} stroke="#475569" strokeWidth={1.6} strokeLinecap="round" />
    <line x1={0} y1={-5} x2={0} y2={5} stroke="#475569" strokeWidth={1.6} strokeLinecap="round" />
  </g>
)

const AddPicker = ({
  x,
  y,
  onPick,
}: {
  x: number
  y: number
  onPick: (group: CircleGroup) => void
}) => {
  const W = 44
  const H = 22
  const GAP = 4
  return (
    <g transform={`translate(${x}, ${y})`}>
      <PickerButton
        x={-W - GAP / 2}
        y={-H - 10}
        w={W}
        h={H}
        label="Ref"
        fill={COLORS.ref}
        onClick={() => onPick('ref')}
      />
      <PickerButton
        x={GAP / 2}
        y={-H - 10}
        w={W}
        h={H}
        label="Pred"
        fill={COLORS.pred}
        onClick={() => onPick('pred')}
      />
    </g>
  )
}

const PickerButton = ({
  x,
  y,
  w,
  h,
  label,
  fill,
  onClick,
}: {
  x: number
  y: number
  w: number
  h: number
  label: string
  fill: string
  onClick: () => void
}) => (
  <g
    style={{ cursor: 'pointer' }}
    onPointerDown={(e) => {
      e.stopPropagation()
      onClick()
    }}
  >
    <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} />
    <text
      x={x + w / 2}
      y={y + h / 2 + 4}
      textAnchor="middle"
      fontSize={12}
      fontWeight={600}
      fill="white"
      pointerEvents="none"
    >
      {label}
    </text>
  </g>
)
