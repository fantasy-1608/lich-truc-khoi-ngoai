export const WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

type JsPDFDocument = {
  addFileToVFS: (filename: string, filecontent: string) => void;
  addFont: (postScriptName: string, id: string, fontStyle: string) => void;
  setFont: (fontName: string, fontStyle?: string) => void;
  output: (type: 'blob') => Blob;
};

const PDF_FONT_FAMILY = 'NotoSansSchedule';
let fontDataPromise: Promise<{ regular: string; bold: string }> | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return window.btoa(binary);
};

const fetchFontAsBase64 = async (filename: string): Promise<string> => {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/${filename}`);
  if (!response.ok) {
    throw new Error(`Could not load PDF font: ${filename}`);
  }

  return arrayBufferToBase64(await response.arrayBuffer());
};

const loadPDFFonts = (): Promise<{ regular: string; bold: string }> => {
  fontDataPromise ??= Promise.all([
    fetchFontAsBase64('NotoSans-Regular.ttf'),
    fetchFontAsBase64('NotoSans-Bold.ttf'),
  ]).then(([regular, bold]) => ({ regular, bold }));

  return fontDataPromise;
};

export const registerPDFFonts = async (pdf: JsPDFDocument): Promise<void> => {
  const fonts = await loadPDFFonts();
  pdf.addFileToVFS('NotoSans-Regular.ttf', fonts.regular);
  pdf.addFileToVFS('NotoSans-Bold.ttf', fonts.bold);
  pdf.addFont('NotoSans-Regular.ttf', PDF_FONT_FAMILY, 'normal');
  pdf.addFont('NotoSans-Bold.ttf', PDF_FONT_FAMILY, 'bold');
  pdf.setFont(PDF_FONT_FAMILY, 'normal');
};

export const setPDFFont = (
  pdf: Pick<JsPDFDocument, 'setFont'>,
  style: 'normal' | 'bold' = 'normal',
): void => {
  pdf.setFont(PDF_FONT_FAMILY, style);
};

export const savePDFBlob = async (pdfBlob: Blob, filename: string): Promise<void> => {
  const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (
        window as unknown as { showSaveFilePicker: (options: unknown) => Promise<any> }
      ).showSaveFilePicker({
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
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
    }
  }

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
