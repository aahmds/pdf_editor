import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { pdfjsLib } from './pdfWorker';
import type { Annotation } from '../types';

export async function loadPdfFile(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function getPageCount(pdfBytes: Uint8Array): Promise<number> {
  // Use pdf.js instead of pdf-lib — much lighter for just counting pages
  const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
  const count = doc.numPages;
  doc.destroy();
  return count;
}

export async function applyAnnotations(
  pdfBytes: Uint8Array,
  annotations: Annotation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  function getFont(family?: string) {
    switch (family) {
      case 'TimesRoman': return timesRoman;
      case 'Courier': return courier;
      default: return helvetica;
    }
  }

  for (const annotation of annotations) {
    try {
      const page = pages[annotation.page];
      if (!page) {
        console.warn(`Page ${annotation.page} not found, skipping annotation`);
        continue;
      }

      const pageHeight = page.getHeight();

      switch (annotation.type) {
        case 'text':
          page.drawText(annotation.content || '', {
            x: annotation.x,
            y: pageHeight - annotation.y - (annotation.fontSize || 14),
            size: annotation.fontSize || 14,
            font: getFont(annotation.fontFamily),
            color: hexToRgb(annotation.fontColor || '#000000'),
          });
          break;

        case 'signature':
        case 'drawing':
          if (annotation.content && annotation.content.startsWith('data:image')) {
            try {
              const imageBytes = base64ToBytes(annotation.content);
              const image = await pdfDoc.embedPng(imageBytes);
              page.drawImage(image, {
                x: annotation.x,
                y: pageHeight - annotation.y - annotation.height,
                width: annotation.width,
                height: annotation.height,
              });
            } catch (imgError) {
              console.error('Error embedding image:', imgError);
              // Try as JPEG if PNG fails
              try {
                const imageBytes = base64ToBytes(annotation.content);
                const image = await pdfDoc.embedJpg(imageBytes);
                page.drawImage(image, {
                  x: annotation.x,
                  y: pageHeight - annotation.y - annotation.height,
                  width: annotation.width,
                  height: annotation.height,
                });
              } catch (jpgError) {
                console.error('Error embedding as JPEG too:', jpgError);
              }
            }
          }
          break;

        case 'checkbox':
          if (annotation.checked) {
            // Draw a checkmark using a simple X pattern that works with standard fonts
            page.drawText('X', {
              x: annotation.x + 3,
              y: pageHeight - annotation.y - 12,
              size: 12,
              font: helvetica,
              color: rgb(0, 0, 0),
            });
          }
          break;

        case 'redact':
          page.drawRectangle({
            x: annotation.x,
            y: pageHeight - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            color: rgb(0, 0, 0),
          });
          break;

        case 'form-text':
          page.drawText(annotation.content || '', {
            x: annotation.x,
            y: pageHeight - annotation.y - (annotation.fontSize || 14),
            size: annotation.fontSize || 14,
            font: getFont(annotation.fontFamily),
            color: hexToRgb(annotation.fontColor || '#000000'),
          });
          break;

        case 'form-checkbox':
          page.drawRectangle({
            x: annotation.x,
            y: pageHeight - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
            color: rgb(1, 1, 1),
          });
          if (annotation.checked) {
            page.drawText('X', {
              x: annotation.x + 3,
              y: pageHeight - annotation.y - annotation.height + 3,
              size: Math.min(annotation.width, annotation.height) * 0.7,
              font: helvetica,
              color: rgb(0, 0, 0),
            });
          }
          break;

        case 'form-dropdown':
          page.drawRectangle({
            x: annotation.x,
            y: pageHeight - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            borderColor: rgb(0.6, 0.6, 0.6),
            borderWidth: 1,
            color: rgb(1, 1, 1),
          });
          page.drawText(annotation.content || '', {
            x: annotation.x + 4,
            y: pageHeight - annotation.y - (annotation.fontSize || 12) - 2,
            size: annotation.fontSize || 12,
            font: helvetica,
            color: rgb(0, 0, 0),
          });
          break;

        case 'highlight':
          page.drawRectangle({
            x: annotation.x,
            y: pageHeight - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            color: hexToRgb(annotation.highlightColor || '#FFFF00'),
            opacity: 0.35,
          });
          break;

        case 'image':
          if (annotation.imageDataUrl && annotation.imageDataUrl.startsWith('data:image')) {
            try {
              const imgBytes = base64ToBytes(annotation.imageDataUrl);
              let img;
              if (annotation.imageDataUrl.includes('image/png')) {
                img = await pdfDoc.embedPng(imgBytes);
              } else {
                img = await pdfDoc.embedJpg(imgBytes);
              }
              page.drawImage(img, {
                x: annotation.x,
                y: pageHeight - annotation.y - annotation.height,
                width: annotation.width,
                height: annotation.height,
              });
            } catch (e) {
              console.error('Error embedding image annotation:', e);
            }
          }
          break;

        case 'stamp':
          {
            const stampTexts: Record<string, string> = {
              approved: 'APPROUVÉ',
              rejected: 'REJETÉ',
              urgent: 'URGENT',
              confidential: 'CONFIDENTIEL',
              draft: 'BROUILLON',
            };
            const stampColors: Record<string, ReturnType<typeof rgb>> = {
              approved: rgb(0, 0.6, 0),
              rejected: rgb(0.8, 0, 0),
              urgent: rgb(0.9, 0.4, 0),
              confidential: rgb(0.5, 0, 0.5),
              draft: rgb(0.5, 0.5, 0.5),
            };
            const stampText = stampTexts[annotation.stampType || 'draft'] || annotation.stampType || 'STAMP';
            const stampColor = stampColors[annotation.stampType || 'draft'] || rgb(0.5, 0.5, 0.5);
            // Draw border rectangle
            page.drawRectangle({
              x: annotation.x,
              y: pageHeight - annotation.y - annotation.height,
              width: annotation.width,
              height: annotation.height,
              borderColor: stampColor,
              borderWidth: 3,
              opacity: 0.8,
            });
            // Draw stamp text
            const stampFontSize = Math.min(annotation.width / (stampText.length * 0.6), annotation.height * 0.6);
            page.drawText(stampText, {
              x: annotation.x + 8,
              y: pageHeight - annotation.y - annotation.height + (annotation.height - stampFontSize) / 2,
              size: stampFontSize,
              font: helvetica,
              color: stampColor,
              opacity: 0.8,
            });
          }
          break;

        case 'sticky-note':
          // Draw a small yellow square icon
          page.drawRectangle({
            x: annotation.x,
            y: pageHeight - annotation.y - 24,
            width: 24,
            height: 24,
            color: hexToRgb(annotation.stickyNoteColor || '#FFF176'),
            borderColor: rgb(0.8, 0.7, 0),
            borderWidth: 1,
          });
          // Draw note marker (standard font compatible)
          page.drawText('N', {
            x: annotation.x + 7,
            y: pageHeight - annotation.y - 18,
            size: 12,
            font: helvetica,
            color: rgb(0.5, 0.4, 0),
          });
          break;
      }
    } catch (annotationError) {
      console.error(`Error processing annotation ${annotation.id}:`, annotationError);
      // Continue with other annotations
    }
  }

  return await pdfDoc.save();
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return rgb(0, 0, 0);
  return rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  );
}

function base64ToBytes(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function downloadPdf(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
