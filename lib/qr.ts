/**
 * Zero-dependency QR Code (ISO/IEC 18004) generator for Qrave.
 * Generates crisp vector SVG strings and SVG Data URLs for table tents & print packs.
 */

// Galois Field (GF 256) tables for Reed-Solomon Error Correction
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    EXP_TABLE[i + 255] = val;
    LOG_TABLE[val] = i;
    val = (val << 1) ^ (val & 128 ? 0x11d : 0);
  }
})();

function gMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function getGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gMul(poly[j], EXP_TABLE[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function calculateReedSolomon(data: Uint8Array, eccCount: number): Uint8Array {
  const gen = getGeneratorPoly(eccCount);
  const res = new Uint8Array(data.length + eccCount);
  res.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

// Version table capacities for Byte Mode with Error Correction Level M
// [version, totalCodewords, dataCodewords, eccCodewordsPerBlock, numBlocks]
const VERSION_SPECS: [number, number, number, number, number][] = [
  [1, 26, 16, 10, 1],
  [2, 44, 28, 16, 1],
  [3, 70, 44, 26, 1],
  [4, 100, 64, 18, 2],
  [5, 134, 86, 24, 2],
  [6, 172, 108, 16, 4],
  [7, 196, 124, 18, 4],
  [8, 242, 154, 22, 4],
  [9, 292, 182, 22, 5],
  [10, 346, 216, 26, 5],
];

// Alignment pattern locations by version
const ALIGNMENT_LOCATIONS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function selectVersion(byteLength: number): [number, number, number, number, number] {
  for (const spec of VERSION_SPECS) {
    // 4 bits mode + 8 bits length for v1-9 (16 for v10+)
    const headerBits = spec[0] < 10 ? 12 : 20;
    const availableBytes = Math.floor((spec[2] * 8 - headerBits) / 8);
    if (byteLength <= availableBytes) {
      return spec;
    }
  }
  return VERSION_SPECS[VERSION_SPECS.length - 1];
}

class BitBuffer {
  bits: number[] = [];

  put(num: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((num >>> i) & 1);
    }
  }

  getBytes(): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(this.bits.length / 8));
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i]) {
        bytes[i >>> 3] |= 0x80 >>> (i & 7);
      }
    }
    return bytes;
  }
}

export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);
  const [version, totalCodewords, dataCodewords, eccPerBlock, numBlocks] = selectVersion(rawBytes.length);

  const bb = new BitBuffer();
  bb.put(4, 4); // Byte mode indicator: 0100
  bb.put(rawBytes.length, version < 10 ? 8 : 16); // Character count indicator

  for (let i = 0; i < rawBytes.length; i++) {
    bb.put(rawBytes[i], 8);
  }

  // Terminator
  const totalDataBits = dataCodewords * 8;
  const remaining = totalDataBits - bb.bits.length;
  bb.put(0, Math.min(4, Math.max(0, remaining)));

  // Pad to byte boundary
  while (bb.bits.length % 8 !== 0) {
    bb.put(0, 1);
  }

  // Pad bytes 0xEC, 0x11
  let padToggle = false;
  while (bb.bits.length < totalDataBits) {
    bb.put(padToggle ? 0x11 : 0xec, 8);
    padToggle = !padToggle;
  }

  const dataBytes = bb.getBytes();

  // Block splitting & ECC generation
  const blockSize = Math.floor(dataCodewords / numBlocks);
  const blocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];

  let offset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const curSize = i < (dataCodewords % numBlocks) ? blockSize + 1 : blockSize;
    const blockData = dataBytes.slice(offset, offset + curSize);
    offset += curSize;
    blocks.push(blockData);
    eccBlocks.push(calculateReedSolomon(blockData, eccPerBlock));
  }

  // Interleave data codewords
  const interleaved: number[] = [];
  const maxBlockLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < blocks[b].length) {
        interleaved.push(blocks[b][i]);
      }
    }
  }

  // Interleave ECC codewords
  for (let i = 0; i < eccPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < eccBlocks[b].length) {
        interleaved.push(eccBlocks[b][i]);
      }
    }
  }

  // Initialize module matrix
  const size = version * 4 + 17;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean) => {
    matrix[r][c] = val;
    isFunction[r][c] = true;
  };

  // 1. Finder patterns (7x7) + separators
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r;
        const tc = col + c;
        if (tr >= 0 && tr < size && tc >= 0 && tc < size) {
          const isBlack =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(tr, tc, isBlack);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Alignment patterns for Version 2+
  const alignPoints = ALIGNMENT_LOCATIONS[version] || [];
  for (let i = 0; i < alignPoints.length; i++) {
    for (let j = 0; j < alignPoints.length; j++) {
      const ar = alignPoints[i];
      const ac = alignPoints[j];
      // Do not overlap finders
      if (isFunction[ar][ac]) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isBlack = Math.max(Math.abs(r), Math.abs(c)) === 2 || (r === 0 && c === 0);
          setModule(ar + r, ac + c, isBlack);
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark module
  setModule(size - 8, 8, true);

  // Reserve format information areas
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      if (matrix[8][i] === null) isFunction[8][i] = true;
      if (matrix[i][8] === null) isFunction[i][8] = true;
    }
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) isFunction[8][i] = true;
    if (matrix[i][8] === null) isFunction[i][8] = true;
  }

  // 5. Populate data bits in zig-zag
  const allBits: number[] = [];
  for (const b of interleaved) {
    for (let bit = 7; bit >= 0; bit--) {
      allBits.push((b >>> bit) & 1);
    }
  }

  let bitIdx = 0;
  let dir = -1; // Moving upwards
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--; // Skip vertical timing column
    const rows = dir === -1
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [col, col - 1]) {
        if (!isFunction[r][c]) {
          const bitVal = bitIdx < allBits.length ? allBits[bitIdx++] === 1 : false;
          // Apply standard Mask 0: (row + col) % 2 === 0
          const maskInvert = (r + c) % 2 === 0;
          matrix[r][c] = maskInvert ? !bitVal : bitVal;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }

  // 6. Write format info (EC Level M = 00, Mask 0 = 000 -> 00000 ^ 101010000010010 = 101010000010010)
  // Precomputed format bits for EC Level M, Mask 0: 0x5412 -> 101010000010010
  const formatBits = 0x5412;
  const getFBit = (idx: number) => ((formatBits >>> (14 - idx)) & 1) === 1;

  // Format around top-left
  setModule(8, 0, getFBit(0));
  setModule(8, 1, getFBit(1));
  setModule(8, 2, getFBit(2));
  setModule(8, 3, getFBit(3));
  setModule(8, 4, getFBit(4));
  setModule(8, 5, getFBit(5));
  setModule(8, 7, getFBit(6));
  setModule(8, 8, getFBit(7));
  setModule(7, 8, getFBit(8));
  setModule(5, 8, getFBit(9));
  setModule(4, 8, getFBit(10));
  setModule(3, 8, getFBit(11));
  setModule(2, 8, getFBit(12));
  setModule(1, 8, getFBit(13));
  setModule(0, 8, getFBit(14));

  // Format around top-right & bottom-left
  for (let i = 0; i <= 7; i++) {
    setModule(8, size - 1 - i, getFBit(i));
  }
  for (let i = 8; i <= 14; i++) {
    setModule(size - (15 - i), 8, getFBit(i));
  }

  return matrix.map((row) => row.map((m) => Boolean(m)));
}

/**
 * Returns a high-definition, responsive SVG string for the QR code.
 */
export function generateQrSvg(text: string, options: { size?: number; margin?: number; color?: string; bgColor?: string } = {}): string {
  const matrix = generateQrMatrix(text);
  const moduleCount = matrix.length;
  const margin = options.margin ?? 3;
  const totalModules = moduleCount + margin * 2;
  const color = options.color ?? "#0f172a";
  const bgColor = options.bgColor ?? "#ffffff";

  let rects = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${color}" shape-rendering="crispEdges"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="100%" height="100%">
    <rect width="${totalModules}" height="${totalModules}" fill="${bgColor}"/>
    ${rects}
  </svg>`;
}

/**
 * Returns a clean SVG data URL that can be directly used in <img src="..." />
 */
export function generateQrDataUrl(text: string, options?: { size?: number; margin?: number; color?: string; bgColor?: string }): string {
  const svg = generateQrSvg(text, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
