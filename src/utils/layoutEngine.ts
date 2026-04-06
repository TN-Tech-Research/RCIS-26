import { LayoutBlock, ProjectRecord } from '../types';

export const BLOCKS_PER_HALF = 10;
export const BLOCKS_PER_ROW = 20;

export const BLOCK_W = 72;
export const BLOCK_H = 48;
export const GAP_X = 4;
// Gap after an L→R row (within a pair): half the base
export const GAP_Y_INNER = 6;
// Gap after an R→L row (between pairs): double the base
export const GAP_Y_OUTER = 24;
export const CENTER_GAP = 36;
export const PADDING = 16;

export const STRIDE_X = BLOCK_W + GAP_X;
export const HALF_W = BLOCKS_PER_HALF * STRIDE_X - GAP_X;
export const TOTAL_INNER_W = 2 * HALF_W + CENTER_GAP;
export const SVG_W = TOTAL_INNER_W + 2 * PADDING;

// Returns the top-Y coordinate for each row index.
// Gap after even row (L→R → R→L within pair) = GAP_Y_INNER
// Gap after odd row  (R→L → L→R between pairs) = GAP_Y_OUTER
export function rowYPositions(n: number): number[] {
  const positions: number[] = [];
  let y = PADDING;
  for (let r = 0; r < n; r++) {
    positions.push(y);
    const gap = r % 2 === 0 ? GAP_Y_INNER : GAP_Y_OUTER;
    y += BLOCK_H + gap;
  }
  return positions;
}

export function svgHeight(n: number): number {
  if (n === 0) return PADDING * 2;
  const positions = rowYPositions(n);
  return positions[n - 1] + BLOCK_H + PADDING;
}

export function blockX(side: 'left' | 'right', col: number): number {
  const halfOffset = side === 'right' ? HALF_W + CENTER_GAP : 0;
  return PADDING + halfOffset + col * STRIDE_X;
}

export function blockY(row: number, yPositions: number[]): number {
  return yPositions[row];
}

export function buildLayout(records: ProjectRecord[]): LayoutBlock[] {
  return records.map((record, seqIndex) => {
    const rowIndex = Math.floor(seqIndex / BLOCKS_PER_ROW);
    const posInRow = seqIndex % BLOCKS_PER_ROW;
    const isLTR = rowIndex % 2 === 0;

    let side: 'left' | 'right';
    let col: number;

    if (isLTR) {
      // Left-to-right: first 10 go in left half, next 10 in right half
      side = posInRow < BLOCKS_PER_HALF ? 'left' : 'right';
      col = posInRow % BLOCKS_PER_HALF;
    } else {
      // Right-to-left: first 10 positions go in right half (reversed), next 10 in left half (reversed)
      side = posInRow < BLOCKS_PER_HALF ? 'right' : 'left';
      col = (BLOCKS_PER_HALF - 1) - (posInRow % BLOCKS_PER_HALF);
    }

    return { record, seqIndex, row: rowIndex, side, col };
  });
}

export function numRows(recordCount: number): number {
  return Math.ceil(recordCount / BLOCKS_PER_ROW);
}
