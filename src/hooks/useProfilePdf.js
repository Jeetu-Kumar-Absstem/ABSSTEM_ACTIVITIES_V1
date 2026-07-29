import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { usePdf } from './usePdf';
import { GAMES } from '../utils/constants';

export const useProfilePdf = () => {
  const { downloadPdf } = usePdf();

  const generateProfileSummary = async ({ user, stats }) => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // --- Header Section ---
      page.drawRectangle({
        x: 0,
        y: height - 100,
        width: width,
        height: 100,
        color: rgb(0.10, 0.24, 0.43), // #1a3c6e
      });

      page.drawText('PROFILE SUMMARY', {
        x: 50,
        y: height - 60,
        size: 24,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText('Absstem Activities Portal', {
        x: 50,
        y: height - 80,
        size: 12,
        font: fontRegular,
        color: rgb(0.8, 0.8, 0.8),
      });

      // --- User Details ---
      let yPos = height - 140;
      const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
      const empId = user?.user_metadata?.emp_id || user?.user_metadata?.employee_code || user?.user_metadata?.empId || 'N/A';
      const dept = user?.user_metadata?.department || 'General';

      page.drawText(`Name: ${userName}`, { x: 50, y: yPos, size: 14, font: fontBold });
      yPos -= 20;
      page.drawText(`Employee ID: ${empId}`, { x: 50, y: yPos, size: 12, font: fontRegular });
      yPos -= 20;
      page.drawText(`Department: ${dept}`, { x: 50, y: yPos, size: 12, font: fontRegular });
      yPos -= 40;

      // --- Table Header ---
      const tableTop = yPos;
      const colWidths = [150, 70, 60, 60, 60, 60];
      const colNames = ['Game', 'Played', 'Wins', 'Losses', 'Draws', 'Points'];
      const startX = 50;

      // Table Header BG
      page.drawRectangle({
        x: startX - 5,
        y: tableTop - 5,
        width: width - 100 + 10,
        height: 25,
        color: rgb(0.9, 0.9, 0.9),
      });

      let currentX = startX;
      colNames.forEach((name, i) => {
        page.drawText(name, { x: currentX, y: tableTop + 5, size: 10, font: fontBold });
        currentX += colWidths[i];
      });

      yPos -= 30;

      // --- Table Content ---
      stats.forEach((row) => {
        if (yPos < 50) {
          // Add new page if needed (simplified for this summary)
        }

        currentX = startX;
        const values = [
          row.game.name,
          String(row.gamesPlayed),
          String(row.wins),
          String(row.losses),
          String(row.draws),
          String(row.points)
        ];

        values.forEach((val, i) => {
          page.drawText(val, { x: currentX, y: yPos, size: 10, font: fontRegular });
          currentX += colWidths[i];
        });

        // Horizontal Line
        page.drawLine({
          start: { x: startX - 5, y: yPos - 5 },
          end: { x: width - 50 + 5, y: yPos - 5 },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });

        yPos -= 25;
      });

      // --- Footer ---
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      page.drawText(`Generated on: ${dateStr}`, {
        x: 50,
        y: 30,
        size: 8,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      const safeName = userName.replace(/\s+/g, '_');
      await downloadPdf(pdfBytes, `Profile_Summary_${safeName}.pdf`);

      return { success: true };
    } catch (err) {
      console.error('[useProfilePdf] Generation failed:', err);
      return { success: false, error: err.message };
    }
  };

  return { generateProfileSummary };
};
