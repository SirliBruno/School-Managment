import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ExportPdfOptions {
  elementId?: string;
  element?: HTMLElement | null;
  filename: string;
}

export async function exportHtmlToPdf({
  elementId,
  element,
  filename,
}: ExportPdfOptions): Promise<void> {
  // Ensure DOM is fully loaded and fonts are ready
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Fallback if font loading API is unsupported
    }
  }

  const targetElement =
    element || (elementId ? document.getElementById(elementId) : null);

  if (!targetElement) {
    throw new Error("لم يتم العثور على عنصر استمارة المساءلة لتوليد الـ PDF.");
  }

  // Ensure element has rendered dimensions
  if (targetElement.scrollWidth === 0 || targetElement.scrollHeight === 0) {
    // Wait one rendering frame for offscreen element to settle
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Generate canvas with high-DPI scaling and fixed scroll offsets
  const canvas = await html2canvas(targetElement, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: 0,
    windowWidth: targetElement.scrollWidth || 794, // 210mm in ~96dpi pixels
    windowHeight: targetElement.scrollHeight || 1123, // 297mm in ~96dpi pixels
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.98);

  // Initialize jsPDF A4 Document in millimeters (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // Calculate scaled height to fit within A4
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
  } else {
    // Fit precisely within single page to prevent multi-page spill
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, pageHeight, undefined, "FAST");
  }

  // Trigger download
  pdf.save(filename);
}
