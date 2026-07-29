// src/hooks/usePdf.js
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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

        // ✅ Step 2: Write to Downloads folder
        let result;
        try {
          result = await Filesystem.writeFile({
            path: `Downloads/${fileName}`,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
        } catch (writeErr) {
          // Fallback to Documents directory if ExternalStorage fails
          console.warn('[usePdf] ExternalStorage failed, falling back to Documents:', writeErr);
          result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
        }

        // ✅ Step 3: Share sheet so user can open in PDF viewer
        await Share.share({
          title: fileName,
          url: result.uri,
          dialogTitle: 'PDF saved — open or share',
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