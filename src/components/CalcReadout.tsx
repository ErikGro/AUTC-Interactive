import type { PQStats } from '../lib/metrics'

type Props = {
  threshold: number | null
  stats: PQStats | null
  source: 'hover' | 'pinned' | null
}

export const CalcReadout = ({ threshold, stats, source }: Props) => {
  if (threshold === null || stats === null) {
    return (
      <div className="min-h-[260px] bg-base-100 border border-base-300 border-dashed rounded-lg p-4 flex items-center justify-center text-sm opacity-60 italic">
        Hover the chart to inspect a threshold. Click to pin.
      </div>
    )
  }

  const { tp, fp, fn, sq, rq, pq, matchedPairs } = stats
  const iouList = matchedPairs.map((p) => p.iou.toFixed(3)).join(' + ')
  const rqNum = tp
  const rqDen = tp + 0.5 * fp + 0.5 * fn

  return (
    <div className="min-h-[260px] font-mono text-sm leading-relaxed bg-base-100 border border-base-300 rounded-lg p-4">
      <div className="mb-2 text-base font-semibold not-italic">
        @ threshold t = {threshold.toFixed(3)}{' '}
        <span className="badge badge-sm ml-1">
          {source === 'hover' ? 'hover preview' : 'pinned'}
        </span>
      </div>

      <div>
        TP = <b>{tp}</b>, FP = <b>{fp}</b>, FN = <b>{fn}</b>
      </div>

      <div className="mt-2">
        RQ = TP / (TP + 0.5·FP + 0.5·FN)
        <br />
        &nbsp;&nbsp;&nbsp; = {rqNum} / ({tp} + 0.5·{fp} + 0.5·{fn})
        <br />
        &nbsp;&nbsp;&nbsp; = {rqNum} / {rqDen.toFixed(2)} = <b>{rq.toFixed(3)}</b>
      </div>

      <div className="mt-2">
        SQ = mean IoU of matched pairs
        <br />
        &nbsp;&nbsp;&nbsp; ={' '}
        {tp === 0
          ? '0 (no matches)'
          : `(${iouList}) / ${tp} = `}
        {tp === 0 ? '' : <b>{sq.toFixed(3)}</b>}
      </div>

      <div className="mt-2">
        PQ = SQ · RQ = {sq.toFixed(3)} · {rq.toFixed(3)} ={' '}
        <b className="text-base">{pq.toFixed(3)}</b>
      </div>
    </div>
  )
}
