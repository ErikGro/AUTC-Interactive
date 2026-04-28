import { useMemo, useState } from 'react'
import { Scene, type PredStatus, type RefStatus } from './components/Scene'
import { OffsetSlider } from './components/OffsetSlider'
import { CurveChart, type ThresholdMode } from './components/CurveChart'
import { CalcReadout } from './components/CalcReadout'
import { DEFAULT_PREDS, DEFAULT_REFS } from './lib/scene'
import {
  computeAUTC,
  computeAUTCStep,
  computeCurve,
  computePQ,
  computeSortedAP,
  computeSortedAPCurve,
  sceneThresholds,
} from './lib/metrics'
import type { MatcherKind } from './lib/matchers'
import type { Circle } from './lib/geometry'
import { Legend } from './components/Legend'

export const App = () => {
  const [refs] = useState<Circle[]>(DEFAULT_REFS)
  const [preds, setPreds] = useState<Circle[]>(DEFAULT_PREDS)
  const [offset, setOffset] = useState(0)
  const [hoverThreshold, setHoverThreshold] = useState<number | null>(null)
  const [pinnedThreshold, setPinnedThreshold] = useState<number | null>(null)
  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('scene')
  const [matcherKind, setMatcherKind] = useState<MatcherKind>('greedy')
  const [hasEverPinned, setHasEverPinned] = useState(false)

  const effectivePreds = useMemo(
    () => preds.map((c) => ({ ...c, x: c.x + offset })),
    [preds, offset],
  )
  const thresholds = useMemo(
    () =>
      thresholdMode === 'scene'
        ? sceneThresholds(refs, effectivePreds)
        : undefined,
    [thresholdMode, refs, effectivePreds],
  )
  const curve = useMemo(
    () => computeCurve(refs, effectivePreds, thresholds, matcherKind),
    [refs, effectivePreds, thresholds, matcherKind],
  )
  const autc = useMemo(
    () => (thresholdMode === 'scene' ? computeAUTCStep(curve) : computeAUTC(curve)),
    [thresholdMode, curve],
  )
  const sortedApCurve = useMemo(
    () => computeSortedAPCurve(refs, effectivePreds, matcherKind),
    [refs, effectivePreds, matcherKind],
  )
  const sortedAp = useMemo(
    () => computeSortedAP(sortedApCurve),
    [sortedApCurve],
  )

  const activeThreshold = hoverThreshold ?? pinnedThreshold
  const activeSource: 'hover' | 'pinned' | null =
    hoverThreshold !== null ? 'hover' : pinnedThreshold !== null ? 'pinned' : null

  const activeStats = useMemo(
    () =>
      activeThreshold === null
        ? null
        : computePQ(refs, effectivePreds, activeThreshold, matcherKind),
    [refs, effectivePreds, activeThreshold, matcherKind],
  )

  const { refStatuses, predStatuses } = useMemo(() => {
    if (!activeStats) {
      return {
        refStatuses: undefined,
        predStatuses: undefined,
      }
    }
    const matchedRef = new Set(activeStats.matchedPairs.map((p) => p.refIdx))
    const matchedPred = new Set(activeStats.matchedPairs.map((p) => p.predIdx))
    return {
      refStatuses: refs.map<RefStatus>((_, i) =>
        matchedRef.has(i) ? 'TP' : 'FN',
      ),
      predStatuses: preds.map<PredStatus>((_, i) =>
        matchedPred.has(i) ? 'TP' : 'FP',
      ),
    }
  }, [activeStats, refs, preds])

  const handlePredChange = (id: string, x: number, y: number) => {
    setPreds((prev) => prev.map((c) => (c.id === id ? { ...c, x, y } : c)))
  }

  const handleReset = () => {
    setPreds(DEFAULT_PREDS)
    setOffset(0)
    setPinnedThreshold(null)
    setHoverThreshold(null)
  }

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className='text-xl mb-2'>Interactive AUTC</h1>
            <p className="text-sm">
              Drag the filled prediction circles or use the offset slider.
              Hover the chart to preview a threshold; click to pin.
            </p>
          </div>
          <a
            href="https://github.com/ErikGro/AUTC-Interactive"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="btn btn-ghost btn-circle shrink-0"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.01-.02-1.98-3.2.69-3.87-1.54-3.87-1.54-.53-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.2 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.73 18.27.5 12 .5z" />
            </svg>
          </a>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col">
            <Legend hasActiveThreshold={activeThreshold != null} />
            <Scene
              refs={refs}
              preds={preds}
              offset={offset}
              refStatuses={refStatuses}
              predStatuses={predStatuses}
              onPredChange={handlePredChange}
            />
            <OffsetSlider value={offset} onChange={setOffset} />
            <div className='mt-1'>
              <button className="btn btn-soft tn-sm" onClick={handleReset}>
                Reset scene
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <CurveChart
              curve={curve}
              autc={autc}
              sortedApCurve={sortedApCurve}
              sortedAp={sortedAp}
              hoverThreshold={hoverThreshold}
              pinnedThreshold={pinnedThreshold}
              pqAtActive={activeStats?.pq ?? null}
              renderMode={thresholdMode === 'scene' ? 'step' : 'linear'}
              showHint={!hasEverPinned}
              thresholdMode={thresholdMode}
              onThresholdModeChange={setThresholdMode}
              matcherKind={matcherKind}
              onMatcherChange={setMatcherKind}
              onHover={setHoverThreshold}
              onPin={(t) => {
                setPinnedThreshold(t)
                setHasEverPinned(true)
              }}
              onClearPin={() => setPinnedThreshold(null)}
            />
            <CalcReadout
              threshold={activeThreshold}
              stats={activeStats}
              source={activeSource}
            />
          </div>
        </div>
      </div>
    </div >
  )
}

export default App
