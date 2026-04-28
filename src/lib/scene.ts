import type { Circle } from './geometry'

export const SCENE_WIDTH = 600
export const SCENE_HEIGHT = 362

export const DEFAULT_REFS: Circle[] = [
  { id: 'r1', x: 150, y: 140, r: 55 },
  { id: 'r2', x: 320, y: 210, r: 70 },
  { id: 'r3', x: 470, y: 130, r: 45 },
]

export const DEFAULT_PREDS: Circle[] = [
  { id: 'p1', x: 145, y: 150, r: 55 },
  { id: 'p2', x: 300, y: 210, r: 65 },
  { id: 'p3', x: 485, y: 145, r: 50 },
]
