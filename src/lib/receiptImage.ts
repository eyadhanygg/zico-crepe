import { BRAND } from '@/config/brand';
import { formatDateTime } from '@/lib/dateTime';
import { formatMoney } from '@/lib/format';
import { ORDER_TYPE_LABELS, type OrderReceipt } from '@/types/pos';

const WIDTH = 480;
const PADDING = 28;
const SCALE = 2;
const LINE_HEIGHT = 24;
const FONT_FAMILY = 'Tajawal, sans-serif';
const INK = '#1a1410';
const MUTED = '#6b625b';
const RULE = '#b9b0a6';
const EMPTY_VALUE = '—';

const COL_TOTAL_X = PADDING;
const COL_PRICE_X = 150;
const COL_QTY_X = 300;
const NAME_MAX_WIDTH = WIDTH - PADDING - 320;

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  align: CanvasTextAlign,
  weight: number,
  size: number,
  color: string,
) {
  setFont(ctx, weight, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current === '' || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== '') lines.push(current);
  return lines.length > 0 ? lines : [EMPTY_VALUE];
}

function paintReceipt(ctx: CanvasRenderingContext2D, receipt: OrderReceipt): number {
  const isDelivery = receipt.orderType === 'delivery';
  const right = WIDTH - PADDING;
  let y = PADDING;

  const centered = (value: string, weight: number, size: number, color: string) => {
    drawText(ctx, value, WIDTH / 2, y, 'center', weight, size, color);
  };

  const rule = () => {
    y += 8;
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.moveTo(PADDING, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 16;
  };

  const pair = (label: string, value: string) => {
    setFont(ctx, 400, 16);
    const labelWidth = ctx.measureText(label).width;
    setFont(ctx, 700, 16);
    const lines = wrapText(ctx, value || EMPTY_VALUE, WIDTH - PADDING * 2 - labelWidth - 12);
    drawText(ctx, label, right, y, 'right', 400, 16, MUTED);
    lines.forEach((line, index) => {
      drawText(ctx, line, PADDING, y + index * LINE_HEIGHT, 'left', 700, 16, INK);
    });
    y += lines.length * LINE_HEIGHT;
  };

  ctx.direction = 'rtl';
  centered(BRAND.nameAr, 700, 28, INK);
  y += 32;
  centered(BRAND.name, 400, 15, INK);
  y += 24;
  centered(BRAND.tagline, 400, 14, MUTED);
  y += 24;
  if (BRAND.address !== '') {
    centered(BRAND.address, 400, 14, MUTED);
    y += 22;
  }
  if (BRAND.phone !== '') {
    centered(`هاتف: ${BRAND.phone}`, 400, 14, MUTED);
    y += 22;
  }
  y += 8;
  centered(`فاتورة #${receipt.orderNumber}`, 700, 22, INK);
  y += 30;

  rule();
  pair('التاريخ', formatDateTime(receipt.createdAt));
  y += 6;
  pair('نوع الطلب', ORDER_TYPE_LABELS[receipt.orderType]);
  rule();

  centered('بيانات العميل', 700, 16, INK);
  y += 30;
  pair('الاسم', receipt.customerName);
  y += 6;
  pair('الهاتف', receipt.customerPhone);
  if (isDelivery) {
    y += 6;
    pair('العنوان', receipt.deliveryAddress);
    y += 6;
    pair(
      'المسافة',
      receipt.deliveryDistanceKm === null ? '' : `${receipt.deliveryDistanceKm} كم`,
    );
  }
  rule();

  drawText(ctx, 'الصنف', right, y, 'right', 700, 14, MUTED);
  drawText(ctx, 'الكمية', COL_QTY_X, y, 'center', 700, 14, MUTED);
  drawText(ctx, 'السعر', COL_PRICE_X, y, 'left', 700, 14, MUTED);
  drawText(ctx, 'الإجمالي', COL_TOTAL_X, y, 'left', 700, 14, MUTED);
  y += LINE_HEIGHT + 4;

  for (const line of receipt.lines) {
    setFont(ctx, 700, 16);
    const nameLines = wrapText(ctx, line.name, NAME_MAX_WIDTH);
    nameLines.forEach((text, index) => {
      drawText(ctx, text, right, y + index * LINE_HEIGHT, 'right', 700, 16, INK);
    });
    drawText(ctx, String(line.quantity), COL_QTY_X, y, 'center', 700, 16, INK);
    drawText(ctx, formatMoney(line.unitPrice), COL_PRICE_X, y, 'left', 400, 16, INK);
    drawText(ctx, formatMoney(line.lineTotal), COL_TOTAL_X, y, 'left', 700, 16, INK);
    y += nameLines.length * LINE_HEIGHT + 6;
  }
  rule();

  pair('المجموع الفرعي', formatMoney(receipt.subtotal));
  if (isDelivery) {
    y += 6;
    pair('رسوم التوصيل', formatMoney(receipt.deliveryFee));
  }
  y += 10;
  drawText(ctx, 'الإجمالي', right, y, 'right', 700, 20, INK);
  drawText(ctx, formatMoney(receipt.total), PADDING, y, 'left', 700, 20, INK);
  y += 36;

  rule();
  centered('شكرًا لزيارتكم', 400, 15, MUTED);
  y += LINE_HEIGHT;

  return y + PADDING - LINE_HEIGHT;
}

async function loadReceiptFonts() {
  await Promise.allSettled([
    document.fonts.load(`400 16px Tajawal`),
    document.fonts.load(`700 16px Tajawal`),
  ]);
}

export async function renderReceiptPng(receipt: OrderReceipt): Promise<Blob> {
  await loadReceiptFonts();

  const measureCtx = document.createElement('canvas').getContext('2d');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!measureCtx || !ctx) throw new Error('المتصفح لا يدعم إنشاء الصور');

  const height = paintReceipt(measureCtx, receipt);
  canvas.width = WIDTH * SCALE;
  canvas.height = Math.ceil(height * SCALE);
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);
  paintReceipt(ctx, receipt);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('تعذر إنشاء صورة الفاتورة'));
    }, 'image/png');
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function saveReceiptImage(receipt: OrderReceipt): Promise<void> {
  const blob = await renderReceiptPng(receipt);
  const fileName = `receipt-${receipt.orderNumber}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `فاتورة #${receipt.orderNumber}` });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  downloadBlob(blob, fileName);
}
