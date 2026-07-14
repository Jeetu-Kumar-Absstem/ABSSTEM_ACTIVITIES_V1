// src/hooks/useCertificate.js
// Loads the Absstem certificate PDF template from Supabase Storage,
// overlays the employee name on the blank underline, and triggers download.
//
// Uses pdf-lib — install once:  npm install pdf-lib
//
// Template facts (measured from the actual PDF):
//   Page:  792 × 528.914 pts  (landscape A4-ish, made in Adobe Illustrator)
//   Fonts: Lufga-Bold, Lufga-SemiBold, Lufga-Regular (all embedded)
//   pdf-lib uses bottom-left origin → y = 528.914 - pdfplumber_top
//
//   "This certificate is proudly presented to"  top=238
//   ── blue underline ──────────────────────    top≈265
//   NAME GOES HERE                              y=234 (bottom-left) 
//   "for being courageous…"                     top=322

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase } from '../utils/supabase';



const PAGE_HEIGHT = 528.914;
const PAGE_WIDTH  = 792;

// ── Overlay config — coordinates calibrated to your actual PDF ───────────────
const NAME_Y        = 234;   // baseline of employee name (on the underline)
const NAME_SIZE     = 26;    // large enough to be readable, fits long names
const NAME_COLOR    = rgb(0.063, 0.278, 0.506);  // Absstem dark navy #104779



// ── Fetch template from Supabase Storage (public bucket) ────────────────────
// Bucket name: certificates   File name: certificate_template.pdf
// Set bucket to PUBLIC in Supabase Dashboard → Storage
const fetchTemplate = async () => {
  const { data } = supabase.storage
    .from('certificates')
    .getPublicUrl('certificate_template.pdf');

  const res = await fetch(data.publicUrl);
  if (!res.ok) throw new Error(
    `Cannot load certificate template (HTTP ${res.status}). ` +
    'Upload "certificate_template.pdf" to the "certificates" Storage bucket and make it public.'
  );
  return res.arrayBuffer();
};

// Centre text horizontally on the page
const centreX = (text, font, size) => {
  const w = font.widthOfTextAtSize(text, size);
  return (PAGE_WIDTH - w) / 2;
};

// ── Main hook ────────────────────────────────────────────────────────────────
export const useCertificate = () => {

  const generateCertificate = async ({
    employeeName,    // "Jeetu kr"
    employeeId,      // employee_code — used for the DB record
    tournamentId,    // uuid
    tournamentName,  // "Carrom Sports Day"
    position,        // 1 | 2 | 3 | null (null = participation only)
    issuedBy,        // emp_id of whoever triggered it (admin or self)
  }) => {
    try {
      // 1. Load the PDF template
      const templateBytes = await fetchTemplate();
      const pdfDoc = await PDFDocument.load(templateBytes);

      // 2. Embed Helvetica Bold (closest standard font to Lufga-Bold)
      //    The actual Lufga font is embedded in the template visually;
      //    we overlay text using Helvetica so no external font file is needed.
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // 3. Get page
      const page = pdfDoc.getPages()[0];

      // 4. Draw employee name centred on the underline
      const nameText = employeeName.toUpperCase(); // matches certificate style
      page.drawText(nameText, {
        x:     centreX(nameText, boldFont, NAME_SIZE),
        y:     NAME_Y,
        size:  NAME_SIZE,
        font:  boldFont,
        color: NAME_COLOR,
      });

      // 5. Save & download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${employeeName.replace(/\s+/g, '_')}_Absstem_Certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 6. Record / increment in certificates table (non-fatal if fails)
      try {
        await supabase
          .from('certificates')
          .upsert({
            tournament_id:  tournamentId,
            employee_id:    employeeId.toUpperCase(),
            position:       position || 0,
            issued_by:      issuedBy || null,
            downloaded:     true,
            download_count: 1,
          }, { onConflict: 'tournament_id,employee_id' });

        await supabase.rpc('certificate_mark_downloaded', {
          p_tournament_id: tournamentId,
          p_employee_id:   employeeId,
        });
      } catch (dbErr) {
        console.warn('[Certificate] DB record failed (non-fatal):', dbErr);
      }

      return { success: true };
    } catch (err) {
      console.error('[Certificate] Generation failed:', err);
      return { success: false, error: err.message };
    }
  };

  return { generateCertificate };
};