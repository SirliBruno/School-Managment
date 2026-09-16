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
  // 1. Ensure DOM is fully loaded and fonts are ready
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

  // 2. Allow element styling and layout to stabilize in DOM
  await new Promise((resolve) => setTimeout(resolve, 150));

  // 3. Generate high-resolution canvas with scale 3 for crisp Arabic text
  const canvas = await html2canvas(targetElement, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: 0,
    windowWidth: 794, // Standard 210mm in ~96 DPI screen pixels
    windowHeight: 1123, // Standard 297mm in ~96 DPI screen pixels
    onclone: (clonedDoc) => {
      // Ensure visibility in cloned document
      const clonedElement = clonedDoc.getElementById(
        targetElement.id || "absence-a4-pdf-document"
      );
      if (clonedElement) {
        clonedElement.style.visibility = "visible";
        clonedElement.style.display = "block";
      }
    },
  });

  const imgData = canvas.toDataURL("image/png");

  // 4. Initialize jsPDF A4 Document in millimeters (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // Add image exactly scaled to 210mm width and 297mm height
  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

  // 5. Trigger download
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

