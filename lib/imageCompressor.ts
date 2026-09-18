/**
 * أداة ذكية لضغط وتحسين صور التقارير الطبية والمرفقات من طرف المتصفح
 * لتقليل استهلاك مساحة التخزين السحابية وتسريع الرفع مع الحفاظ على وضوح الخط والأختام
 */

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // percentage saved
  previewUrl: string;
}

export async function compressMedicalReportImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8
): Promise<CompressionResult> {
  // إذا لم يكن الملف صورة (مثل ملفات الـ PDF)، يتم إرجاعه كما هو دون تعديل
  if (!file.type.startsWith("image/")) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
      previewUrl: "",
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // حساب الأبعاد الجديدة مع الحفاظ التام على النسبة والتناسب
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = height;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // في حال تعذر الحصول على الـ context، نرجع الملف الأصلي بأمان
          resolve({
            file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
            previewUrl: event.target?.result as string,
          });
          return;
        }

        // تحسين تنعيم الرسم للحفاظ على وضوح نصوص التقارير الطبية
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // رسم خلفية بيضاء لتجنب الشفافية في ملفات PNG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
                previewUrl: event.target?.result as string,
              });
              return;
            }

            // إذا كان الحجم المضغوط أكبر من الأصلي (نادر جداً)، نحتفظ بالأصلي
            if (blob.size >= file.size) {
              resolve({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
                previewUrl: event.target?.result as string,
              });
              return;
            }

            // صياغة اسم ملف جديد بامتداد jpg
            const originalBaseName = file.name.substring(
              0,
              file.name.lastIndexOf(".")
            ) || file.name;
            const newFileName = `${originalBaseName}_opt.jpg`;

            const compressedFile = new File([blob], newFileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            const ratio = Math.round(
              ((file.size - blob.size) / file.size) * 100
            );

            const previewUrl = canvas.toDataURL("image/jpeg", quality);

            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: blob.size,
              compressionRatio: ratio,
              previewUrl,
            });
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        resolve({
          file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 0,
          previewUrl: event.target?.result as string,
        });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
        previewUrl: "",
      });
    };

    reader.readAsDataURL(file);
  });
}
