import { describe, it, expect } from 'vitest'
import { linearSumAssignment } from './hungarian'

// Brute-force optimal assignment for tiny matrices, used as a ground-truth
// oracle for the cross-checks below.
function bruteForce(cost: number[][]): {
  rowInd: number[]
  colInd: number[]
  total: number
} {
  const m = cost.length
  if (m === 0) return { rowInd: [], colInd: [], total: 0 }
  const n = cost[0].length
  if (n === 0) return { rowInd: [], colInd: [], total: 0 }
  const N = Math.max(m, n)
  const PAD =
    Math.max(...cost.flatMap((row) => row.map((v) => Math.abs(v))), 0) + 1
  // Pad to square with high-cost dummy entries.
  const a: number[][] = []
  for (let i = 0; i < N; i++) {
    const row = new Array<number>(N).fill(PAD)
    if (i < m) for (let j = 0; j < n; j++) row[j] = cost[i][j]
    a.push(row)
  }
  // Enumerate all permutations of column indices.
  const cols = Array.from({ length: N }, (_, i) => i)
  let best: number[] | null = null
  let bestTotal = Infinity
  const permute = (arr: number[], k: number) => {
    if (k === arr.length) {
      let total = 0
      for (let i = 0; i < arr.length; i++) total += a[i][arr[i]]
      if (total < bestTotal) {
        bestTotal = total
        best = arr.slice()
      }
      return
    }
    for (let i = k; i < arr.length; i++) {
      ;[arr[k], arr[i]] = [arr[i], arr[k]]
      permute(arr, k + 1)
      ;[arr[k], arr[i]] = [arr[i], arr[k]]
    }
  }
  permute(cols, 0)
  if (best === null) return { rowInd: [], colInd: [], total: 0 }
  // Filter to original (unpadded) rectangle.
  const rowInd: number[] = []
  const colInd: number[] = []
  let total = 0
  for (let i = 0; i < N; i++) {
    const j = best[i]
    if (i < m && j < n) {
      rowInd.push(i)
      colInd.push(j)
      total += cost[i][j]
    }
  }
  return { rowInd, colInd, total }
}

function totalCost(
  cost: number[][],
  rowInd: number[],
  colInd: number[],
): number {
  let s = 0
  for (let k = 0; k < rowInd.length; k++) s += cost[rowInd[k]][colInd[k]]
  return s
}

describe('linearSumAssignment — degenerate inputs', () => {
  it('returns empty for an empty matrix', () => {
    expect(linearSumAssignment([])).toEqual({ rowInd: [], colInd: [] })
  })

  it('returns empty when there are zero columns', () => {
    expect(linearSumAssignment([[]])).toEqual({ rowInd: [], colInd: [] })
  })

  it('handles a 1×1 matrix', () => {
    const r = linearSumAssignment([[7]])
    expect(r).toEqual({ rowInd: [0], colInd: [0] })
  })
})

describe('linearSumAssignment — square cases', () => {
  it('assigns the diagonal when it is uniquely cheapest', () => {
    const cost = [
      [1, 9, 9],
      [9, 1, 9],
      [9, 9, 1],
    ]
    const r = linearSumAssignment(cost)
    expect(r.rowInd).toEqual([0, 1, 2])
    expect(r.colInd).toEqual([0, 1, 2])
    expect(totalCost(cost, r.rowInd, r.colInd)).toBe(3)
  })

  it('finds the off-diagonal optimum on a known 2×2', () => {
    // Optimal: (0,1)=1, (1,0)=3. Total 4.
    const cost = [
      [2, 1],
      [3, 4],
    ]
    const r = linearSumAssignment(cost)
    expect(totalCost(cost, r.rowInd, r.colInd)).toBe(4)
  })

  it('beats greedy on a contention example', () => {
    // Greedy on cost (smallest first) would pick (0,0)=1 then (1,1)=10 → total 11.
    // Optimal is (0,1)=2, (1,0)=3 → total 5.
    const cost = [
      [1, 2],
      [3, 10],
    ]
    const r = linearSumAssignment(cost)
    expect(totalCost(cost, r.rowInd, r.colInd)).toBe(5)
  })

  it('classic 3×3 textbook example', () => {
    // (1,1)=0 is the row-1 minimum but using it forces (0, 0 or 2) and (2, 0 or 2)
    // for a worse total. Optimal is (0,1)=1, (1,0)=2, (2,2)=2 → total 5.
    const cost = [
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ]
    const r = linearSumAssignment(cost)
    expect(totalCost(cost, r.rowInd, r.colInd)).toBe(5)
  })
})

describe('linearSumAssignment — rectangular cases', () => {
  it('more cols than rows: assigns each row, drops a column', () => {
    // 2×3 matrix: pick best two columns, leaving the worst column unassigned.
    const cost = [
      [1, 2, 100],
      [100, 3, 4],
    ]
    const r = linearSumAssignment(cost)
    expect(r.rowInd.length).toBe(2)
    expect(totalCost(cost, r.rowInd, r.colInd)).toBe(1 + 3)
  })

  it('more rows than cols: assigns each column, drops a row', () => {
    // 3×2 matrix.
    const cost = [
      [1, 100],
      [100, 2],
      [50, 50],
    ]
    const r = linearSumAssignment(cost)
    expect(r.rowInd.length).toBe(2)
    expect(totalCost(cost, r.rowInd, r.colInd)).toBe(1 + 2)
  })
})

describe('linearSumAssignment — output well-formedness', () => {
  it('row indices are unique and within [0, m)', () => {
    const cost = [
      [3, 1, 4],
      [1, 5, 9],
      [2, 6, 5],
      [3, 5, 8],
    ]
    const r = linearSumAssignment(cost)
    const seen = new Set<number>()
    for (const i of r.rowInd) {
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(cost.length)
      expect(seen.has(i)).toBe(false)
      seen.add(i)
    }
  })

  it('col indices are unique and within [0, n)', () => {
    const cost = [
      [3, 1, 4],
      [1, 5, 9],
      [2, 6, 5],
      [3, 5, 8],
    ]
    const r = linearSumAssignment(cost)
    const seen = new Set<number>()
    for (const j of r.colInd) {
      expect(j).toBeGreaterThanOrEqual(0)
      expect(j).toBeLessThan(cost[0].length)
      expect(seen.has(j)).toBe(false)
      seen.add(j)
    }
  })

  it('returns min(m, n) pairs', () => {
    const m = 4
    const n = 3
    const cost = Array.from({ length: m }, () =>
      Array.from({ length: n }, () => Math.random()),
    )
    const r = linearSumAssignment(cost)
    expect(r.rowInd.length).toBe(Math.min(m, n))
    expect(r.colInd.length).toBe(Math.min(m, n))
  })
})

describe('linearSumAssignment — random cross-check vs brute force', () => {
  // For each shape we run a few random matrices and confirm the algorithm
  // produces the same total cost as brute force enumeration.
  const shapes: Array<[number, number]> = [
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
    [3, 5],
    [5, 3],
    [2, 6],
    [6, 2],
  ]
  for (const [m, n] of shapes) {
    it(`matches brute force on random ${m}×${n} matrices`, () => {
      // Deterministic seed via a simple LCG so failures are reproducible.
      let seed = 0xc0ffee + m * 31 + n
      const rng = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        return seed / 0x7fffffff
      }
      for (let trial = 0; trial < 6; trial++) {
        const cost = Array.from({ length: m }, () =>
          Array.from({ length: n }, () => Math.floor(rng() * 100)),
        )
        const got = linearSumAssignment(cost)
        const oracle = bruteForce(cost)
        const gotTotal = totalCost(cost, got.rowInd, got.colInd)
        expect(gotTotal).toBe(oracle.total)
      }
    })
  }
})

describe('linearSumAssignment — handles negative and floating-point costs', () => {
  it('works with negative costs', () => {
    const cost = [
      [-3, -1],
      [-2, -5],
    ]
    const r = linearSumAssignment(cost)
    // Optimal: (0,0)=-3 + (1,1)=-5 → -8. Other: (0,1)=-1 + (1,0)=-2 → -3.
    expect(totalCost(cost, r.rowInd, r.colInd)).toBe(-8)
  })

  it('works with float costs', () => {
    const cost = [
      [0.1, 0.9, 0.5],
      [0.4, 0.2, 0.7],
      [0.6, 0.3, 0.05],
    ]
    const r = linearSumAssignment(cost)
    const oracle = bruteForce(cost)
    expect(totalCost(cost, r.rowInd, r.colInd)).toBeCloseTo(oracle.total, 12)
  })
})
