// src/hooks/usePdf.js
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Split a filename into base and extension.
 *   "Rahul_Rank1_Carrom.pdf"  →  { base: "Rahul_Rank1_Carrom", ext: ".pdf" }
 *   "MyFile"                  →  { base: "MyFile",              ext: ""     }
 */
const splitFileName = (fileName) => {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0) return { base: fileName, ext: '' };
  return {
    base: fileName.slice(0, dotIndex),
    ext:  fileName.slice(dotIndex),        // includes the dot, e.g. ".pdf"
  };
};

/**
 * Find a non-colliding filename in the given Capacitor directory.
 * Tries: fileName → fileName(1) → fileName(2) … up to 999.
 *
 *   "Report.pdf" already exists  →  returns "Report(1).pdf"
 *   "Report(1).pdf" also exists  →  returns "Report(2).pdf"
 *
 * Uses Filesystem.stat() to probe; a thrown error means "file not found" → slot is free.
 */
const findFreeFileName = async (folder, fileName, directory) => {
  const { base, ext } = splitFileName(fileName);

  // Helper: does `folder/candidate` already exist?
  const exists = async (candidate) => {
    try {
      await Filesystem.stat({ path: `${folder}/${candidate}`, directory });
      return true;       // stat succeeded → file exists
    } catch {
      return false;      // stat threw → file does not exist
    }
  };

  // First try the plain name
  if (!(await exists(fileName))) return fileName;

  // Then try (1), (2), …
  for (let i = 1; i < 1000; i++) {
    const candidate = `${base}(${i})${ext}`;
    if (!(await exists(candidate))) return candidate;
  }

  // Fallback: timestamp suffix (should never be reached in practice)
  return `${base}_${Date.now()}${ext}`;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const usePdf = () => {
  const downloadPdf = async (pdfBytes, fileName) => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Convert Uint8Array to Base64
        const base64Data = btoa(
          pdfBytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // ✅ Step 1: Request storage permission at runtime
        const permission = await Filesystem.requestPermissions();
        if (permission.publicStorage !== 'granted') {
          return { success: false, error: 'Storage permission denied by user.' };
        }

        // ✅ Step 2: Resolve a free filename, then write to Downloads folder
        let result;
        try {
          const freeFileName = await findFreeFileName('Downloads', fileName, Directory.ExternalStorage);
          result = await Filesystem.writeFile({
            path:      `Downloads/${freeFileName}`,
            data:      base64Data,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
        } catch (writeErr) {
          // Fallback to Documents directory if ExternalStorage fails
          console.warn('[usePdf] ExternalStorage failed, falling back to Documents:', writeErr);
          const freeFileName = await findFreeFileName('', fileName, Directory.Documents);
          result = await Filesystem.writeFile({
            path:      freeFileName,
            data:      base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
        }

        // ✅ Step 3: Share sheet so user can open in PDF viewer
        await Share.share({
          title:      fileName,
          url:        result.uri,
          dialogTitle: 'PDF saved — open or share',
        });

        return { success: true };
      } else {
        // ── WEB ──────────────────────────────────────────────────────────────
        // Browsers already append " (1)", " (2)" etc. when a file with the
        // same name already exists in the Downloads folder, so no extra work
        // is needed here.
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true };
      }
    } catch (err) {
      console.error('[usePdf] Download failed:', err);
      return { success: false, error: err.message };
    }
  };

  return { downloadPdf };
};