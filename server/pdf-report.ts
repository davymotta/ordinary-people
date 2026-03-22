/**
 * PDF Report Generator — Ordinary People
 *
 * Genera un report PDF professionale per i brand manager.
 * Layout: copertina → executive summary → KPI → distribuzione → citazioni → raccomandazioni.
 *
 * Design: palette terracotta (#C4714A), grigio antracite (#1A1A1A), bianco (#FFFFFF).
 * Font: Helvetica (built-in pdfkit).
 */

import PDFDocument from "pdfkit";
import type { Writable } from "stream";

// ─── Types ────────────────────────────────────────────────────────────

export interface ReportData {
  testName: string;
  completedAt: Date | null;
  totalAgents: number;
  completedAgents: number;
  avgScore: number | null;
  avgBuy: number | null;
  avgShare: number | null;
  avgAttraction: number | null;
  avgRepulsion: number | null;
  avgEmotionalIntensity: number | null;
  buckets: {
    veryPositive: number;
    positive: number;
    neutral: number;
    negative: number;
  };
  executiveSummary: string | null;
  commonPatterns: string | null;
  keyDivergences: string | null;
  recommendations: string | null;
  riskFlags: string[];
  topQuotes: Array<{
    agentId: number;
    agentName?: string;
    quote: string;
    overallScore: number | null;
    gutReaction?: string;
  }>;
  brandName?: string;
}

// ─── Color palette ────────────────────────────────────────────────────

const TERRACOTTA = "#C4714A";
const DARK = "#1A1A1A";
const MUTED = "#6B6B6B";
const LIGHT_BG = "#F9F5F0";
const BORDER = "#E8E0D6";
const EMERALD = "#2D7A4F";
const RED = "#C0392B";
const AMBER = "#D4860A";

// ─── Helpers ──────────────────────────────────────────────────────────

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

function fmtScore(v: number | null | undefined): string {
  if (v == null) return "—";
  return (v > 0 ? "+" : "") + v.toFixed(2);
}

function scoreColor(score: number | null | undefined): string {
  if (score == null) return MUTED;
  if (score >= 0.3) return EMERALD;
  if (score >= -0.1) return AMBER;
  return RED;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ─── PDF Generator ────────────────────────────────────────────────────

export function generateReportPdf(data: ReportData, output: Writable): void {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: `Ordinary People — ${data.testName}`,
      Author: "Ordinary People Platform",
      Subject: "Consumer Simulation Report",
    },
  });

  doc.pipe(output);

  const W = doc.page.width - 100; // usable width (margin 50 each side)

  // ─── COVER PAGE ───────────────────────────────────────────────────

  // Background header band
  doc.rect(0, 0, doc.page.width, 200).fill(DARK);

  // Logo / brand mark
  doc.fontSize(11).fillColor(TERRACOTTA).font("Helvetica-Bold")
    .text("ORDINARY PEOPLE", 50, 40, { align: "left" });
  doc.fontSize(8).fillColor("#999999").font("Helvetica")
    .text("Consumer Simulation Platform", 50, 56);

  // Terracotta accent line
  doc.rect(50, 80, 60, 3).fill(TERRACOTTA);

  // Report title
  doc.fontSize(22).fillColor("#FFFFFF").font("Helvetica-Bold")
    .text(data.testName, 50, 100, { width: W });

  doc.fontSize(10).fillColor("#BBBBBB").font("Helvetica")
    .text(
      data.completedAt
        ? `Report generato il ${data.completedAt.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`
        : "Report di simulazione",
      50, 155
    );

  // Panel info
  doc.fontSize(9).fillColor("#999999")
    .text(`Panel: ${data.completedAgents} agenti su ${data.totalAgents} totali`, 50, 175);

  // ─── KPI SUMMARY STRIP ────────────────────────────────────────────

  const kpiY = 220;
  const kpiW = W / 4;

  const kpis = [
    { label: "Score medio", value: fmtScore(data.avgScore), color: scoreColor(data.avgScore) },
    { label: "Prob. acquisto", value: pct(data.avgBuy), color: data.avgBuy != null && data.avgBuy >= 0.4 ? EMERALD : DARK },
    { label: "Prob. condivisione", value: pct(data.avgShare), color: DARK },
    { label: "Intensità emotiva", value: pct(data.avgEmotionalIntensity), color: DARK },
  ];

  kpis.forEach((kpi, i) => {
    const x = 50 + i * kpiW;
    // Card background
    doc.rect(x, kpiY, kpiW - 8, 60).fillAndStroke(LIGHT_BG, BORDER);
    // Label
    doc.fontSize(7).fillColor(MUTED).font("Helvetica")
      .text(kpi.label.toUpperCase(), x + 8, kpiY + 8, { width: kpiW - 20 });
    // Value
    const [r, g, b] = hexToRgb(kpi.color);
    doc.fillColor([r, g, b]).fontSize(18).font("Helvetica-Bold")
      .text(kpi.value, x + 8, kpiY + 22, { width: kpiW - 20 });
  });

  // ─── EXECUTIVE SUMMARY ────────────────────────────────────────────

  if (data.executiveSummary) {
    const esY = kpiY + 80;
    doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold")
      .text("Executive Summary", 50, esY);
    doc.rect(50, esY + 16, W, 1).fill(BORDER);

    doc.fontSize(9).fillColor(DARK).font("Helvetica")
      .text(data.executiveSummary, 50, esY + 24, { width: W, lineGap: 3 });
  }

  // ─── SCORE DISTRIBUTION ───────────────────────────────────────────

  const distY = doc.y + 24;
  doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold")
    .text("Distribuzione risposte", 50, distY);
  doc.rect(50, distY + 16, W, 1).fill(BORDER);

  const n = data.completedAgents;
  const distItems = [
    { label: "Molto positivo (≥0.5)", count: data.buckets.veryPositive, color: EMERALD },
    { label: "Positivo (0.1–0.5)", count: data.buckets.positive, color: "#5BAD7A" },
    { label: "Neutro (−0.1–0.1)", count: data.buckets.neutral, color: AMBER },
    { label: "Negativo (<−0.1)", count: data.buckets.negative, color: RED },
  ];

  let barY = distY + 26;
  distItems.forEach(item => {
    const pctVal = n > 0 ? item.count / n : 0;
    const barW = Math.round(pctVal * (W - 120));

    doc.fontSize(8).fillColor(MUTED).font("Helvetica")
      .text(item.label, 50, barY, { width: 120 });

    // Bar background
    doc.rect(175, barY + 1, W - 120, 10).fill(BORDER);
    // Bar fill
    if (barW > 0) {
      const [r, g, b] = hexToRgb(item.color);
      doc.rect(175, barY + 1, barW, 10).fill([r, g, b]);
    }
    // Count
    doc.fontSize(8).fillColor(DARK).font("Helvetica-Bold")
      .text(`${item.count}`, W - 30, barY, { width: 30, align: "right" });

    barY += 18;
  });

  // ─── ATTRACTION vs REPULSION ──────────────────────────────────────

  const avY = doc.y + 20;
  const halfW = (W - 10) / 2;

  // Attrazione
  doc.rect(50, avY, halfW, 50).fillAndStroke(LIGHT_BG, BORDER);
  doc.fontSize(8).fillColor(MUTED).font("Helvetica")
    .text("ATTRAZIONE MEDIA", 58, avY + 8);
  doc.fontSize(20).fillColor(EMERALD).font("Helvetica-Bold")
    .text(pct(data.avgAttraction), 58, avY + 20);

  // Repulsione
  doc.rect(50 + halfW + 10, avY, halfW, 50).fillAndStroke(LIGHT_BG, BORDER);
  doc.fontSize(8).fillColor(MUTED).font("Helvetica")
    .text("REPULSIONE MEDIA", 58 + halfW + 10, avY + 8);
  doc.fontSize(20).fillColor(RED).font("Helvetica-Bold")
    .text(pct(data.avgRepulsion), 58 + halfW + 10, avY + 20);

  // ─── PATTERNS & DIVERGENCES ───────────────────────────────────────

  if (data.commonPatterns || data.keyDivergences) {
    doc.addPage();

    if (data.commonPatterns) {
      doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold")
        .text("Pattern comuni", 50, 50);
      doc.rect(50, 66, W, 1).fill(BORDER);
      doc.fontSize(9).fillColor(DARK).font("Helvetica")
        .text(data.commonPatterns, 50, 74, { width: W, lineGap: 3 });
    }

    if (data.keyDivergences) {
      const kdY = doc.y + 20;
      doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold")
        .text("Divergenze chiave", 50, kdY);
      doc.rect(50, kdY + 16, W, 1).fill(BORDER);
      doc.fontSize(9).fillColor(DARK).font("Helvetica")
        .text(data.keyDivergences, 50, kdY + 24, { width: W, lineGap: 3 });
    }
  }

  // ─── RECOMMENDATIONS ──────────────────────────────────────────────

  if (data.recommendations) {
    const recY = doc.y + 24;
    // Check if we need a new page
    if (recY > doc.page.height - 200) { doc.addPage(); }

    doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold")
      .text("Raccomandazioni strategiche", 50, doc.y + 20);
    doc.rect(50, doc.y + 2, W, 1).fill(BORDER);
    doc.fontSize(9).fillColor(DARK).font("Helvetica")
      .text(data.recommendations, 50, doc.y + 10, { width: W, lineGap: 3 });
  }

  // ─── RISK FLAGS ───────────────────────────────────────────────────

  if (data.riskFlags.length > 0) {
    const rfY = doc.y + 24;
    if (rfY > doc.page.height - 150) { doc.addPage(); }

    doc.fontSize(10).fillColor(RED).font("Helvetica-Bold")
      .text("Risk Flags", 50, doc.y + 20);
    doc.rect(50, doc.y + 2, W, 1).fill(RED);

    data.riskFlags.forEach(flag => {
      doc.fontSize(9).fillColor(DARK).font("Helvetica")
        .text(`• ${flag}`, 58, doc.y + 8, { width: W - 8, lineGap: 2 });
    });
  }

  // ─── TOP QUOTES ───────────────────────────────────────────────────

  if (data.topQuotes.length > 0) {
    doc.addPage();
    doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold")
      .text("Voci dal panel", 50, 50);
    doc.rect(50, 66, W, 1).fill(BORDER);

    let qY = 80;
    data.topQuotes.slice(0, 8).forEach(q => {
      if (qY > doc.page.height - 100) {
        doc.addPage();
        qY = 50;
      }

      const cardH = q.gutReaction ? 70 : 50;
      const scoreC = scoreColor(q.overallScore);
      const [sr, sg, sb] = hexToRgb(scoreC);

      // Card
      doc.rect(50, qY, W, cardH).fillAndStroke(LIGHT_BG, BORDER);

      // Agent info
      doc.fontSize(7).fillColor(MUTED).font("Helvetica")
        .text(q.agentName ? `${q.agentName}` : `Agente #${q.agentId}`, 58, qY + 8);

      // Score badge
      doc.fontSize(8).fillColor([sr, sg, sb]).font("Helvetica-Bold")
        .text(fmtScore(q.overallScore), W - 10, qY + 8, { align: "right", width: 50 });

      // Quote
      doc.fontSize(9).fillColor(DARK).font("Helvetica-Oblique")
        .text(`"${q.quote}"`, 58, qY + 20, { width: W - 20, lineGap: 2 });

      if (q.gutReaction) {
        doc.fontSize(7.5).fillColor(MUTED).font("Helvetica")
          .text(q.gutReaction.slice(0, 120) + (q.gutReaction.length > 120 ? "…" : ""), 58, qY + 44, { width: W - 20 });
      }

      qY += cardH + 8;
    });
  }

  // ─── FOOTER on all pages ──────────────────────────────────────────

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const pageNum = i + 1;
    const total = range.count;
    doc.fontSize(7).fillColor(MUTED).font("Helvetica")
      .text(
        `Ordinary People Platform — Confidenziale — Pagina ${pageNum} di ${total}`,
        50, doc.page.height - 30, { width: W, align: "center" }
      );
    doc.rect(50, doc.page.height - 38, W, 0.5).fill(BORDER);
  }

  doc.end();
}
