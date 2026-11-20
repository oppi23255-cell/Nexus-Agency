import React from 'react';

/**
 * Generates a deterministic crisp SVG QR-style matrix from any payload string
 * so QR previews for requisites, TRC-20 addresses, and Android pairing never break offline.
 */
export function QrCodeSvg({
  value,
  size = 144,
  className = '',
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const grid = 21;
  const cells: boolean[][] = Array.from({ length: grid }, () => Array(grid).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, grid - 7);
  drawFinder(grid - 7, 0);

  // Deterministic hash fill for data modules
  let seed = 2166136261;
  for (let i = 0; i < value.length; i++) {
    seed ^= value.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= grid - 8;
      const inBottomLeft = r >= grid - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      if (r === 6 || c === 6) {
        cells[r][c] = (r + c) % 2 === 0;
        continue;
      }

      seed ^= (r * 31 + c * 17) & 0xff;
      seed = Math.imul(seed, 16777619);
      cells[r][c] = ((seed >>> 16) & 1) === 1;
    }
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-white p-2.5 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${grid} ${grid}`}
        width="100%"
        height="100%"
        shapeRendering="crispEdges"
        aria-label={`QR: ${value}`}
      >
        <rect width={grid} height={grid} fill="#ffffff" />
        {cells.map((row, r) =>
          row.map((filled, c) =>
            filled ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#111111" /> : null
          )
        )}
      </svg>
    </div>
  );
}
