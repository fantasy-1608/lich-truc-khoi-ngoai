// START_DATE removed as it was unused

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export interface PDFOptions {
  title: string;
  month: number;
  year: number;
}

/**
 * Creates a hidden DOM element for PDF rendering
 * Isolated from page CSS to avoid unsupported color functions (oklch)
 */
export const createPDFElement = (): HTMLDivElement => {
  const printElement = document.createElement('div');
  printElement.style.cssText = `
    position: absolute;
    left: -9999px;
    width: 1123px;
    padding: 40px;
    background-color: #ffffff;
    font-family: Inter, Arial, sans-serif;
    color: #000000;
    all: initial;
    font-family: Inter, Arial, sans-serif;
  `;
  return printElement;
};

/**
 * Common CSS styles for PDF tables - Optimized for print readability
 */
export const getCommonPDFStyles = (cellHeight: string = '140px'): string => `
  .print-table { width: 100%; border-collapse: collapse; color: black; }
  .print-table th, .print-table td { border: 1px solid #666; padding: 4px 6px; vertical-align: top; }
  .print-table th { background-color: #e8e8e8; font-weight: bold; text-align: center; font-size: 13px; padding: 8px 4px; }
  .print-table td { height: auto; min-height: ${cellHeight}; text-align: left; }
  .weekend { background-color: #f0f0f0; }
  .date-number { font-weight: bold; text-align: right; margin-bottom: 4px; font-size: 14px; }
`;

/**
 * Generates approval section HTML for PDF
 */
export const getApprovalSection = (): string => {
  const now = new Date();
  return `
    <div style="margin-top: 40px; text-align: right; color: black; font-size: 16px; padding-right: 30px;">
      <p style="font-style: italic;">Ngày ${now.getDate()}, tháng ${now.getMonth() + 1}, năm ${now.getFullYear()}</p>
      <p style="margin-top: 10px; font-weight: bold; font-size: 18px;">DUYỆT LÃNH ĐẠO KHOA</p>
    </div>
  `;
};

/**
 * Week days header for calendar tables
 */
export const WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

/**
 * Generates table header HTML
 */
export const getTableHeader = (): string =>
  `<thead><tr>${WEEK_DAYS.map((day) => `<th>${day}</th>`).join('')}</tr></thead>`;

/**
 * Converts HTML content to PDF and downloads it
 * Uses iframe for complete CSS isolation from page styles
 */
export const generatePDFFromHTML = async (
  htmlContent: string,
  filename: string,
): Promise<void> => {
  // Create an iframe for complete CSS isolation
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position: absolute; left: -9999px; width: 1123px; height: 1px;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    throw new Error('Could not access iframe document');
  }

  // Write clean HTML with only our styles (no page CSS)
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif;
          background-color: #ffffff;
          color: #000000;
          padding: 40px;
        }
      </style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `);
  iframeDoc.close();

  try {
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Dynamic import libraries
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 1.5, // Reduced from 2 for smaller file size
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 1123,
    });

    // Use JPEG with quality 0.8 for much smaller file size
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const pageMargin = 40;
    const pdfWidth = pdf.internal.pageSize.getWidth() - pageMargin * 2;
    const pdfHeight = pdf.internal.pageSize.getHeight() - pageMargin * 2;
    const canvasRatio = canvas.width / canvas.height;

    let finalWidth = pdfWidth;
    let finalHeight = pdfWidth / canvasRatio;

    if (finalHeight > pdfHeight) {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight * canvasRatio;
    }

    pdf.addImage(imgData, 'JPEG', pageMargin, pageMargin, finalWidth, finalHeight);

    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    const pdfBlob = pdf.output('blob');

    // Try File System Access API first (shows native save dialog with correct filename)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as unknown as { showSaveFilePicker: (options: unknown) => Promise<any> }).showSaveFilePicker({
          suggestedName: finalFilename,
          types: [
            {
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
        return;
      } catch (err: unknown) {
        // User cancelled or API not available, fall through to legacy method
        if (err instanceof Error && err.name === 'AbortError') {
          return; // User cancelled, don't proceed
        }
      }
    }

    // Fallback: Use blob URL with download attribute
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  } finally {
    document.body.removeChild(iframe);
  }
};
