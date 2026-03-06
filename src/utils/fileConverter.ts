import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import mammoth from 'mammoth';

// Accepted file extensions and MIME types
export const ACCEPTED_FORMATS = {
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg', 'image/webp'],
  text: ['text/plain'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp,.txt,.docx';

export function isConvertibleFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return (
    ACCEPTED_FORMATS.image.includes(type) ||
    ACCEPTED_FORMATS.text.includes(type) ||
    ACCEPTED_FORMATS.docx.includes(type) ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.txt') ||
    name.endsWith('.docx')
  );
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

async function webpToPng(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'image/webp' });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const pngBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png');
  });
  return new Uint8Array(await pngBlob.arrayBuffer());
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    const words = paragraph.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

export async function imageToPdf(file: File): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  let imageBytes: Uint8Array;

  // Handle WEBP conversion
  if (type === 'image/webp' || name.endsWith('.webp')) {
    imageBytes = await webpToPng(file);
  } else {
    imageBytes = new Uint8Array(await file.arrayBuffer());
  }

  // Embed image based on type
  let image;
  if (type === 'image/png' || name.endsWith('.png') || name.endsWith('.webp')) {
    image = await pdfDoc.embedPng(imageBytes);
  } else if (type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    image = await pdfDoc.embedJpg(imageBytes);
  } else {
    throw new Error(`Format d'image non supporté: ${file.type}`);
  }

  // A4 dimensions and margins
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const maxImageWidth = pageWidth - margin * 2;
  const maxImageHeight = pageHeight - margin * 2;

  // Get image dimensions and validate
  const imageDims = image.scale(1);
  if (imageDims.width > 10000 || imageDims.height > 10000) {
    throw new Error(`Image trop grande (${imageDims.width}x${imageDims.height}). Maximum: 10000x10000`);
  }
  let width = imageDims.width;
  let height = imageDims.height;

  const scaleRatio = Math.min(maxImageWidth / width, maxImageHeight / height);
  width *= scaleRatio;
  height *= scaleRatio;

  // Center image on page
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(image, { x, y, width, height });

  return pdfDoc.save();
}

export async function textToPdf(file: File): Promise<Uint8Array> {
  const text = await file.text();
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const fontSize = 12;
  const lineHeight = 16;
  const maxWidth = pageWidth - margin * 2;
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  // Wrap text to lines
  const lines = wrapText(text, font, fontSize, maxWidth);

  // Paginate text
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let lineCount = 0;
  let y = pageHeight - margin;

  for (const line of lines) {
    if (lineCount >= maxLinesPerPage) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      lineCount = 0;
      y = pageHeight - margin;
    }

    currentPage.drawText(line, {
      x: margin,
      y: y - lineHeight,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= lineHeight;
    lineCount++;
  }

  return pdfDoc.save();
}

export async function docxToPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  // Create a temporary file-like object with text content
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const fontSize = 12;
  const lineHeight = 16;
  const maxWidth = pageWidth - margin * 2;
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  // Wrap text to lines
  const lines = wrapText(text, font, fontSize, maxWidth);

  // Paginate text
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let lineCount = 0;
  let y = pageHeight - margin;

  for (const line of lines) {
    if (lineCount >= maxLinesPerPage) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      lineCount = 0;
      y = pageHeight - margin;
    }

    currentPage.drawText(line, {
      x: margin,
      y: y - lineHeight,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= lineHeight;
    lineCount++;
  }

  return pdfDoc.save();
}

export async function convertToPdf(file: File): Promise<Uint8Array> {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  // If already PDF, return as-is
  if (isPdfFile(file)) {
    return new Uint8Array(await file.arrayBuffer());
  }

  // Route to appropriate converter
  if (
    type === 'image/png' ||
    type === 'image/jpeg' ||
    type === 'image/webp' ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp')
  ) {
    return imageToPdf(file);
  }

  if (type === 'text/plain' || name.endsWith('.txt')) {
    return textToPdf(file);
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return docxToPdf(file);
  }

  throw new Error(`Format non supporté: ${file.name}`);
}
