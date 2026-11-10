/**
 * QR codes as SVG strings and data URLs (table tents, print packs, 2FA setup).
 * Encoding is done by the `qrcode` package; this file only draws the SVG.
 */
import QRCode from "qrcode";

type QrOptions = { size?: number; margin?: number; color?: string; bgColor?: string };

/** The QR module grid (true = dark), error correction level M. */
export function generateQrMatrix(text: string): boolean[][] {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = modules.size;
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => Boolean(modules.get(r, c))));
}

/**
 * Returns a responsive SVG string for the QR code. Dark modules are drawn as
 * one path of horizontal runs, which keeps the markup small.
 */
export function generateQrSvg(text: string, options: QrOptions = {}): string {
  const matrix = generateQrMatrix(text);
  const moduleCount = matrix.length;
  const margin = options.margin ?? 3;
  const totalModules = moduleCount + margin * 2;
  const color = options.color ?? "#0f172a";
  const bgColor = options.bgColor ?? "#ffffff";

  let d = "";
  for (let r = 0; r < moduleCount; r++) {
    let c = 0;
    while (c < moduleCount) {
      if (!matrix[r][c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < moduleCount && matrix[r][c]) c++;
      d += `M${start + margin} ${r + margin}h${c - start}v1h-${c - start}z`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="100%" height="100%" shape-rendering="crispEdges">
    <rect width="${totalModules}" height="${totalModules}" fill="${bgColor}"/>
    <path d="${d}" fill="${color}"/>
  </svg>`;
}

/**
 * Returns a clean SVG data URL that can be directly used in <img src="..." />
 */
export function generateQrDataUrl(text: string, options?: QrOptions): string {
  const svg = generateQrSvg(text, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
