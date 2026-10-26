import { Fragment, useState, useCallback } from 'react';
import type { BoardState, BoardMode, Coordinate, Ship, ShotResult, Orientation } from '../types';

interface BoardProps {
  board: BoardState;
  mode: BoardMode;
  /** For 'place' mode: which ship is being placed, its size, and orientation */
  placingShip?: {
    size: number;
    orientation: Orientation;
  };
  /** Callback when user clicks on a cell */
  onCellClick?: (x: number, y: number) => void;
  /** Label above the board */
  label?: string;
  /** Whether to show ships (false for bot board during BATTLE) */
  showShips?: boolean;
  /** Sunk ship positions to highlight on enemy board */
  sunkPositions?: Set<string>;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * Compute the set of all positions occupied by known ships.
 */
function getShipPositionSet(ships: Ship[] | undefined): Set<string> {
  const set = new Set<string>();
  if (!ships) return set;
  for (const ship of ships) {
    for (const pos of ship.positions) {
      set.add(`${pos.x},${pos.y}`);
    }
  }
  return set;
}

/**
 * Get the hit status for a ship cell based on the ship's hits array.
 */
function getShipCellHitStatus(
  ships: Ship[] | undefined,
  x: number,
  y: number
): 'none' | 'hit' | 'sunk' {
  if (!ships) return 'none';
  for (const ship of ships) {
    for (let i = 0; i < ship.positions.length; i++) {
      if (ship.positions[i].x === x && ship.positions[i].y === y) {
        if (ship.hits.every(Boolean)) return 'sunk';
        if (ship.hits[i]) return 'hit';
        return 'none';
      }
    }
  }
  return 'none';
}

/**
 * Compute preview cells for ship placement.
 */
function getPreviewCells(
  hoverX: number,
  hoverY: number,
  size: number,
  orientation: Orientation,
  occupiedPositions: Set<string>
): { cells: Coordinate[]; valid: boolean } {
  const cells: Coordinate[] = [];
  let valid = true;

  for (let i = 0; i < size; i++) {
    const cx = orientation === 'horizontal' ? hoverX + i : hoverX;
    const cy = orientation === 'vertical' ? hoverY + i : hoverY;

    cells.push({ x: cx, y: cy });

    if (cx < 0 || cx > 9 || cy < 0 || cy > 9) {
      valid = false;
    } else if (occupiedPositions.has(`${cx},${cy}`)) {
      valid = false;
    }
  }

  return { cells, valid };
}

function Board({
  board,
  mode,
  placingShip,
  onCellClick,
  showShips = true,
  sunkPositions,
}: BoardProps) {
  const [hoverCell, setHoverCell] = useState<Coordinate | null>(null);

  const shipPositions = getShipPositionSet(showShips ? board.ships : undefined);

  // Compute preview for ship placement
  const preview = (() => {
    if (mode !== 'place' || !placingShip || !hoverCell) return null;
    return getPreviewCells(
      hoverCell.x,
      hoverCell.y,
      placingShip.size,
      placingShip.orientation,
      shipPositions
    );
  })();

  const previewSet = new Set<string>();
  if (preview) {
    for (const c of preview.cells) {
      previewSet.add(`${c.x},${c.y}`);
    }
  }

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (onCellClick) {
        onCellClick(x, y);
      }
    },
    [onCellClick]
  );

  const getCellClass = (x: number, y: number): string => {
    const key = `${x},${y}`;
    const shotResult: ShotResult | undefined = board.shots[key];
    const isShip = shipPositions.has(key);
    const isSunkHighlight = sunkPositions?.has(key);

    // Preview overlay
    if (previewSet.has(key)) {
      return preview?.valid ? 'cell-preview-valid' : 'cell-preview-invalid';
    }

    // If this is the player's board (showShips=true), show ship + shot overlay
    if (showShips && board.ships) {
      if (isShip) {
        const hitStatus = getShipCellHitStatus(board.ships, x, y);
        if (hitStatus === 'sunk') return 'cell-ship-sunk';
        if (hitStatus === 'hit') return 'cell-ship-hit';
        return 'cell-ship';
      }
      // Shot on water for player board (bot shot us)
      if (shotResult === 'MISS') return 'cell-miss';
      // HIT/SUNK without a ship position shouldn't happen on player board, but handle gracefully
      if (shotResult === 'HIT') return 'cell-hit';
      if (shotResult === 'SUNK') return 'cell-sunk';
      return 'cell-water';
    }

    // Bot board / enemy board: only show shots
    if (isSunkHighlight) {
      return 'cell-sunk';
    }
    if (shotResult === 'MISS') return 'cell-miss';
    if (shotResult === 'HIT') return 'cell-hit';
    if (shotResult === 'SUNK') return 'cell-sunk';

    // Revealed ships in FINISHED phase
    if (isShip) return 'cell-ship';

    return 'cell-water';
  };

  const isClickable = (x: number, y: number): boolean => {
    if (mode === 'view') return false;

    if (mode === 'place') {
      return !!placingShip;
    }

    if (mode === 'shoot') {
      const key = `${x},${y}`;
      return !(key in board.shots);
    }

    return false;
  };

  return (
    <div className="board-wrapper">
      <div className="board-grid">
        {/* Corner cell */}
        <div className="board-corner board-header-cell" />

        {/* Column headers */}
        {COLS.map((col, i) => (
          <div key={`col-${i}`} className="board-header-cell">
            {col}
          </div>
        ))}

        {/* Rows */}
        {Array.from({ length: 10 }, (_, row) => (
          <Fragment key={`row-${row}`}>
            {/* Row header */}
            <div className="board-header-cell">
              {row + 1}
            </div>

            {/* Cells */}
            {Array.from({ length: 10 }, (_, col) => {
              const x = col;
              const y = row;
              const clickable = isClickable(x, y);
              const cellClass = getCellClass(x, y);

              return (
                <div
                  key={`${x}-${y}`}
                  className={`board-cell ${cellClass} ${clickable ? 'cell-clickable' : ''}`}
                  onClick={() => {
                    if (clickable) handleCellClick(x, y);
                  }}
                  onMouseEnter={() => {
                    if (mode === 'place') setHoverCell({ x, y });
                    else if (mode === 'shoot' && clickable) setHoverCell({ x, y });
                  }}
                  onMouseLeave={() => {
                    if (mode === 'place' || mode === 'shoot') setHoverCell(null);
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default Board;
