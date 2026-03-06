import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { pdfjsLib as pdfjs } from './pdfWorker';
import { createWorker } from 'tesseract.js';

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = await mergedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
    for (const page of pages) {
      mergedDoc.addPage(page);
    }
  }

  return mergedDoc.save();
}

export async function splitPdf(
  pdfBytes: Uint8Array,
  ranges: [number, number][]
): Promise<Uint8Array[]> {
  const sourceDoc = await PDFDocument.load(pdfBytes);
  const results: Uint8Array[] = [];

  for (const [start, end] of ranges) {
    const newDoc = await PDFDocument.create();
    const pageIndices = Array.from(
      { length: end - start + 1 },
      (_, i) => start + i
    );
    const pages = await newDoc.copyPages(sourceDoc, pageIndices);
    for (const page of pages) {
      newDoc.addPage(page);
    }
    results.push(await newDoc.save());
  }

  return results;
}

export async function deletePage(
  pdfBytes: Uint8Array,
  pageIndex: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.removePage(pageIndex);
  return pdfDoc.save();
}

export async function reorderPages(
  pdfBytes: Uint8Array,
  newOrder: number[]
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(sourceDoc, newOrder);
  for (const page of pages) {
    newDoc.addPage(page);
  }
  return newDoc.save();
}

export async function exportPageAsImage(
  pdfBytes: Uint8Array,
  pageIndex: number,
  scale: number
): Promise<Blob> {
  const loadingTask = pdfjs.getDocument({ data: pdfBytes });
  const pdfDocument = await loadingTask.promise;
  try {
    const page = await pdfDocument.getPage(pageIndex + 1);

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d')!;
    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  } finally {
    pdfDocument.destroy();
  }
}

export async function protectPdf(
  pdfBytes: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.save({ userPassword: password, ownerPassword: password });
}

export async function runOcr(imageBlob: Blob): Promise<string> {
  const worker = await createWorker('eng');
  const imageUrl = URL.createObjectURL(imageBlob);

  try {
    const { data } = await worker.recognize(imageUrl);
    return data.text;
  } finally {
    URL.revokeObjectURL(imageUrl);
    await worker.terminate();
  }
}

export async function rotatePage(
  pdfBytes: Uint8Array,
  pageIndex: number,
  degrees: 0 | 90 | 180 | 270
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
    throw new Error(`Index de page invalide: ${pageIndex}`);
  }
  const page = pdfDoc.getPage(pageIndex);
  const currentRotation = page.getRotation().angle;
  page.setRotation(degrees === 0 ? degrees : ((currentRotation + degrees) % 360) as any);
  return pdfDoc.save();
}

export async function compressPdf(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.save({ useObjectStreams: true });
}

export async function addWatermark(
  pdfBytes: Uint8Array,
  text: string,
  options?: { opacity?: number; color?: string; fontSize?: number }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const opacity = options?.opacity ?? 0.3;
  const size = options?.fontSize ?? 50;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.7, 0.7, 0.7),
      rotate: degrees(-45),
      opacity,
    });
  }

  return pdfDoc.save();
}

export async function addPageNumbers(
  pdfBytes: Uint8Array,
  format: string = 'Page {n}/{total}'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width } = page.getSize();
    const text = format.replace('{n}', String(i + 1)).replace('{total}', String(total));
    const textWidth = font.widthOfTextAtSize(text, 10);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: 20,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return pdfDoc.save();
}

export async function cropPage(
  pdfBytes: Uint8Array,
  pageIndex: number,
  cropBox: { x: number; y: number; width: number; height: number }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(pageIndex);
  const pageHeight = page.getHeight();
  // cropBox is in top-left origin coords, PDF uses bottom-left
  page.setCropBox(
    cropBox.x,
    pageHeight - cropBox.y - cropBox.height,
    cropBox.width,
    cropBox.height
  );
  return pdfDoc.save();
}

export async function exportPageAsJpeg(
  pdfBytes: Uint8Array,
  pageIndex: number,
  scale: number,
  quality: number = 0.92
): Promise<Blob> {
  const loadingTask = pdfjs.getDocument({ data: pdfBytes });
  const pdfDocument = await loadingTask.promise;
  try {
    const page = await pdfDocument.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d')!;
    await page.render({ canvasContext: context, viewport }).promise;
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to convert to JPEG'))),
        'image/jpeg',
        quality
      );
    });
  } finally {
    pdfDocument.destroy();
  }
}
