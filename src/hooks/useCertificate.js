// src/hooks/useCertificate.js
// Supports 4 certificate types:
//   participation  → Absstem_Certificate_of_participation.pdf  (Name only)
//   rank_1         → Absstem_Certificate_Rank_1.pdf            (Name + Tournament)
//   rank_2         → Absstem_Certificate_Rank_2.pdf            (Name + Tournament)
//   rank_3         → Absstem_Certificate_Rank_3.pdf            (Name + Tournament)
//
// Top-3 finishers get TWO certificates (rank + participation).
// All other participants get ONE (participation only).
//
// PDF facts (measured from actual PDFs):
//   Page: 792 × 528.914 pts  (pdf-lib uses bottom-left origin)
//   Participation:
//     Name sits ON the blue underline → baseline y ≈ 254 (pdf-lib coords)
//   Rank certs:
//     Name  → below "This certificate is proudly presented to" → y ≈ 305
//     Tournament → below "in the" → y ≈ 225

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase } from '../utils/supabase';

// ── Constants ────────────────────────────────────────────────────────────────
const PAGE_HEIGHT = 528.914;
const PAGE_WIDTH  = 792;

// Template file names in the "certificates" Supabase Storage bucket
const TEMPLATE_FILES = {
  participation: 'Absstem_Certificate_of_participation.pdf',
  rank_1:        'Absstem_Certificate_Rank_1.pdf',
  rank_2:        'Absstem_Certificate_Rank_2.pdf',
  rank_3:        'Absstem_Certificate_Rank_3.pdf',
};

// Overlay config — coordinates calibrated from the actual PDFs
// pdf-lib origin is bottom-left; pdfplumber gives top-from-top.
// pdf-lib y = PAGE_HEIGHT - pdfplumber_top
//
// Participation:
//   entry box pdfplumber top=253, bottom=274 → pdf-lib y_center = PAGE_HEIGHT - 263.5 = 265.4
//   We draw at baseline ≈ y_center - fontSize/3
//
// Rank certs:
//   Name: entry box pdfplumber top=190, bottom=225 → pdf-lib y_center = PAGE_HEIGHT - 207.5 = 321.4
//   Tournament: entry box pdfplumber top=282, bottom=307 → pdf-lib y_center = PAGE_HEIGHT - 294.5 = 234.4

const OVERLAY = {
  participation: {
    name: { y: 256, size: 22, color: rgb(0.063, 0.278, 0.506) },   // navy, on the underline
  },
  rank: {
    name:       { y: 310, size: 22, color: rgb(0.063, 0.278, 0.506) },  // navy, below "presented to"
    tournament: { y: 228, size: 14, color: rgb(0.063, 0.278, 0.506) },  // navy, below "in the"
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

// Fetch a template PDF as ArrayBuffer via Supabase public URL
const fetchTemplate = async (fileName) => {
  const { data } = supabase.storage
    .from('certificates')
    .getPublicUrl(fileName);

  const res = await fetch(data.publicUrl);
  if (!res.ok) throw new Error(
    `Cannot load certificate template "${fileName}" (HTTP ${res.status}). ` +
    'Ensure the file is uploaded to the "certificates" Storage bucket and the bucket is public.'
  );
  return res.arrayBuffer();
};

// Centre text horizontally on the page
const centreX = (text, font, size) => {
  const w = font.widthOfTextAtSize(text, size);
  return (PAGE_WIDTH - w) / 2;
};

// Build and download a single filled certificate PDF
const buildAndDownload = async (templateFile, fields, downloadName) => {
  const templateBytes = await fetchTemplate(templateFile);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];

  for (const field of fields) {
    const text = field.text;
    if (!text) continue;
    page.drawText(text, {
      x:    centreX(text, boldFont, field.size),
      y:    field.y,
      size: field.size,
      font: boldFont,
      color: field.color,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Log to certificate_log table (non-fatal)
// Uses plain INSERT — duplicate downloads are silently ignored via error code 23505.
// This avoids needing UPDATE RLS permission that upsert requires.
const logCertificate = async ({ employeeId, tournamentId, certificateType, position, issuedBy }) => {
  try {
    const { error } = await supabase.from('certificate_log').insert({
      employee_id:      employeeId.toUpperCase(),
      tournament_id:    tournamentId,
      certificate_type: certificateType,
      position:         position ?? null,
      issued_by:        issuedBy || null,
      issued_at:        new Date().toISOString(),
    });
    // 23505 = unique_violation (already logged this cert) — safe to ignore
    if (error && error.code !== '23505') {
      console.warn('[Certificate] DB log failed:', error.message, error.code);
    }
  } catch (dbErr) {
    console.warn('[Certificate] DB log failed (non-fatal):', dbErr);
  }
};

// ── Main hook ────────────────────────────────────────────────────────────────
export const useCertificate = () => {

  /**
   * generateCertificate
   *
   * certificateType:
   *   'participation'  → participation cert only (1 PDF download)
   *   'rank_1'         → rank 1 cert only        (1 PDF download)
   *   'rank_2'         → rank 2 cert only        (1 PDF download)
   *   'rank_3'         → rank 3 cert only        (1 PDF download)
   *   'rank_and_participation' → downloads BOTH rank cert + participation cert
   *                              (2 sequential PDF downloads)
   *
   * For top-3 in the Final Results table, call with 'rank_and_participation'.
   * For the All Participants section, always call with 'participation'.
   */
  const generateCertificate = async ({
    employeeName,        // full display name, e.g. "Rahul Sharma"
    employeeId,          // employee code, e.g. "ABST1234"
    tournamentId,        // tournament uuid
    tournamentName,      // e.g. "Carrom Championship 2026"
    position,            // 1 | 2 | 3 | null
    certificateType,     // see above
    issuedBy,            // emp_id of admin or the employee themselves
  }) => {
    try {
      const nameUpper = employeeName.toUpperCase();
      const safeName  = employeeName.replace(/\s+/g, '_');
      const safeTournament = tournamentName.replace(/\s+/g, '_');

      // ── Participation certificate ───────────────────────────────────────
      if (certificateType === 'participation' || certificateType === 'rank_and_participation') {
        await buildAndDownload(
          TEMPLATE_FILES.participation,
          [
            {
              text:  nameUpper,
              y:     OVERLAY.participation.name.y,
              size:  OVERLAY.participation.name.size,
              color: OVERLAY.participation.name.color,
            },
          ],
          `${safeName}_Participation_${safeTournament}.pdf`
        );
        await logCertificate({ employeeId, tournamentId, certificateType: 'participation', position: null, issuedBy });
      }

      // ── Rank certificate ────────────────────────────────────────────────
      const rankType = certificateType === 'rank_and_participation'
        ? (position === 1 ? 'rank_1' : position === 2 ? 'rank_2' : 'rank_3')
        : certificateType; // 'rank_1' / 'rank_2' / 'rank_3'

      if (['rank_1', 'rank_2', 'rank_3'].includes(rankType)) {
        await buildAndDownload(
          TEMPLATE_FILES[rankType],
          [
            {
              text:  nameUpper,
              y:     OVERLAY.rank.name.y,
              size:  OVERLAY.rank.name.size,
              color: OVERLAY.rank.name.color,
            },
            {
              text:  tournamentName,
              y:     OVERLAY.rank.tournament.y,
              size:  OVERLAY.rank.tournament.size,
              color: OVERLAY.rank.tournament.color,
            },
          ],
          `${safeName}_Rank${position}_${safeTournament}.pdf`
        );
        await logCertificate({ employeeId, tournamentId, certificateType: rankType, position, issuedBy });
      }

      return { success: true };
    } catch (err) {
      console.error('[Certificate] Generation failed:', err);
      return { success: false, error: err.message };
    }
  };

  return { generateCertificate };
};