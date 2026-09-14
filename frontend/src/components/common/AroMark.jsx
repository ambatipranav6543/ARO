import React from 'react';

/**
 * ARO brand symbol: the folded upward-arrow mark (spec section 2), on the
 * Navy -> #496A91 -> Ice brand gradient. `gradientId` is kept as a no-op
 * prop for backwards compatibility with existing call sites (it applied to
 * the old inline-SVG gradient def; the artwork is now a single shared
 * raster asset).
 */
export function AroMark({ size = 32 }) {
  return (
    <img
      src="/aro_logo.png"
      alt="ARO"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}
