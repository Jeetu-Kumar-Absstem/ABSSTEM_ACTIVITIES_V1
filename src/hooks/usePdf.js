import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Hook providing a unified way to download PDF files on Web and Mobile (Capacitor).
 */
export const usePdf = () => {
  /**
   * downloadPdf
   * @param {Uint8Array} pdfBytes - The PDF data
   * @param {string} fileName - Suggestion name (e.g. "profile.pdf")
   */
  const downloadPdf = async (pdfBytes, fileName) => {
    try {
      if (Capacitor.isNativePlatform()) {
        // --- MOBILE (Android/iOS) ---
        // Convert Uint8Array to Base64 (Filesystem.writeFile requires base64)
        const base64Data = btoa(
          pdfBytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Save to cache directory
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        // Trigger native share sheet to let user save or open
        await Share.share({
          title: fileName,
          text: 'Here is your PDF document.',
          url: result.uri,
          dialogTitle: 'Open or Save PDF',
        });

        return { success: true };
      } else {
        // --- WEB ---
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
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
