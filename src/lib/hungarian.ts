export type Assignment = {
  rowInd: number[]
  colInd: number[]
}

export function linearSumAssignment(cost: number[][]): Assignment {
  const m = cost.length
  if (m === 0) return { rowInd: [], colInd: [] }
  const n = cost[0].length
  if (n === 0) return { rowInd: [], colInd: [] }

  const N = Math.max(m, n)
  let maxCost = 0
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (cost[i][j] > maxCost) maxCost = cost[i][j]
    }
  }
  const PAD = maxCost + 1

  const a: number[][] = []
  for (let i = 0; i < N; i++) {
    const row = new Array<number>(N).fill(PAD)
    if (i < m) {
      for (let j = 0; j < n; j++) row[j] = cost[i][j]
    }
    a.push(row)
  }

  const INF = Number.POSITIVE_INFINITY
  const u = new Array<number>(N + 1).fill(0)
  const v = new Array<number>(N + 1).fill(0)
  const p = new Array<number>(N + 1).fill(0)
  const way = new Array<number>(N + 1).fill(0)

  for (let i = 1; i <= N; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array<number>(N + 1).fill(INF)
    const used = new Array<boolean>(N + 1).fill(false)

    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = INF
      let j1 = 0
      for (let j = 1; j <= N; j++) {
        if (used[j]) continue
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) {
          minv[j] = cur
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }
      for (let j = 0; j <= N; j++) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else {
          minv[j] -= delta
        }
      }
      j0 = j1
    } while (p[j0] !== 0)

    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0 !== 0)
  }

  const rowInd: number[] = []
  const colInd: number[] = []
  for (let j = 1; j <= N; j++) {
    const i = p[j] - 1
    const c = j - 1
    if (i < m && c < n) {
      rowInd.push(i)
      colInd.push(c)
    }
  }
  return { rowInd, colInd }
}
