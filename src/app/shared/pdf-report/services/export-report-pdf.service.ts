import { Injectable } from '@angular/core';
import { ReportDocument } from '../models/report-document.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BaseSection, ChartSection, HeadingSection, TableSection, TextSection } from '../models/report-section.model';

const DEFAULT_ACCENT_COLOR: [number, number, number] = [30, 90, 140];

const PAGE_WIDTH_MM = 297;
const PAGE_HEIGHT_MM = 210;
const HALF_PAGE_WIDTH_MM = PAGE_WIDTH_MM / 2;

const PAGE_MARGIN_MM = 15;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2;

const SECTION_GAP_MM = 8;

const SECTION_HEADING_FONT_SIZE = 11;
const BODY_FONT_SIZE = 9;
const HEADING_FONT_SIZE = 14;

@Injectable({
  providedIn: 'root',
})
export class ExportReportPdfService {

  private moduleColor: [number, number, number] = DEFAULT_ACCENT_COLOR;

  async export(document: ReportDocument, fileName: string): Promise<void> {
    this.moduleColor = document.metadata.moduleColor ?? DEFAULT_ACCENT_COLOR;
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    let currentY = this.renderCoverPage(pdf, document);
    const sections = [...document.sections];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      currentY = await this.renderSection(pdf, section, currentY);
      if (section.pageBreakAfter && i < sections.length - 1) {
        pdf.addPage();
        currentY = PAGE_MARGIN_MM;
      }
    }

    pdf.save(fileName);
  }

  private renderCoverPage(pdf: jsPDF, document: ReportDocument): number {
    const meta = document.metadata;

    const centerX = PAGE_WIDTH_MM / 2;
    const centerY = PAGE_HEIGHT_MM / 2;
    let startY = centerY - 15;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(...this.moduleColor);
    pdf.text(meta.title, centerX, startY, { align: 'center' });
    startY += 8;

    if (meta.subtitle) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      pdf.text(meta.subtitle, centerX, startY, { align: 'center' });
      startY += 6;
    }

    pdf.setFontSize(BODY_FONT_SIZE);
    pdf.setTextColor(100, 100, 100);
    const formattedDate = meta.dateGenerated ? new Date(meta.dateGenerated).toLocaleDateString('en-US', { dateStyle: 'long' }) : '';
    pdf.text(`Generated: ${formattedDate}`, centerX, startY, { align: 'center' });
    startY += 6;

    pdf.addPage();
    return PAGE_MARGIN_MM;
  }

  private async renderSection(pdf: jsPDF, section: BaseSection, currentY: number): Promise<number> {
    const bottomThreshold = PAGE_HEIGHT_MM - PAGE_MARGIN_MM;
    const titleHeight = section?.title ? 6 : 0;
    let contentHeight = 0;

    switch (section.type) {
      case 'heading':
        const baseHeadingHeight = 12 + SECTION_GAP_MM;
        const nextContentHeightBuffer = 30;
        contentHeight = baseHeadingHeight + nextContentHeightBuffer;
        break;
      case 'text': {
        const textLines = pdf.splitTextToSize((section as TextSection).content, CONTENT_WIDTH_MM);
        contentHeight = textLines.length * 4.5 + SECTION_GAP_MM;
        break;
      }
      case 'table':
        contentHeight = 25;
        break;
      case 'chart': {
        const imageAspectRatio = 2;
        contentHeight = CONTENT_WIDTH_MM / imageAspectRatio + SECTION_GAP_MM;
        break;
      }
    }

    const totalRequiredSpace = titleHeight + contentHeight;
    if (section.pageBreakBefore || (currentY + totalRequiredSpace > bottomThreshold)) {
      pdf.addPage();
      currentY = PAGE_MARGIN_MM;
    }

    switch (section.type) {
      case 'text':
        return this.renderTextSection(pdf, section as TextSection, currentY);
      case 'table':
        return this.renderTableSection(pdf, section as TableSection, currentY);
      case 'chart':
        return this.renderChartSection(pdf, section as ChartSection, currentY);
      case 'heading':
        return this.renderHeadingSection(pdf, section as HeadingSection, currentY);
      default:
        return currentY;
    }
  }

  private renderHeadingSection(pdf: jsPDF, section: HeadingSection, currentY: number): number {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(HEADING_FONT_SIZE);
    pdf.setTextColor(...this.moduleColor);
    pdf.text(section.title, HALF_PAGE_WIDTH_MM, currentY, { align: 'center' });
    currentY += 2;
    const textWidthMM = pdf.getTextWidth(section.title) + 4; 
    const underLineStartX = HALF_PAGE_WIDTH_MM - textWidthMM / 2;
    const underLineEndX = HALF_PAGE_WIDTH_MM + textWidthMM / 2;
    pdf.setDrawColor(...this.moduleColor);
    pdf.setLineWidth(0.5);
    pdf.line(underLineStartX, currentY, underLineEndX, currentY);
    return currentY + SECTION_GAP_MM;
  }

  private renderTextSection(pdf: jsPDF, section: TextSection, currentY: number): number {
    currentY = this.renderSectionTitle(pdf, section.title, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(BODY_FONT_SIZE);
    pdf.setTextColor(40, 40, 40);
    const textLines = pdf.splitTextToSize(section.content, CONTENT_WIDTH_MM);
    pdf.text(textLines, PAGE_MARGIN_MM, currentY);
    return currentY + textLines.length * 4.5 + SECTION_GAP_MM;
  }

  private renderTableSection(pdf: jsPDF, section: TableSection, currentY: number): number {
    currentY = this.renderSectionTitle(pdf, section.title, currentY);
    autoTable(pdf, {
      head: section.subHeaders?.length ? [section.headers, section.subHeaders] : [section.headers],
      body: section.rows,
      startY: currentY,
      margin: { left: PAGE_MARGIN_MM, right: PAGE_MARGIN_MM },
      headStyles: {
        fillColor: this.moduleColor,
        fontSize: BODY_FONT_SIZE,
        fontStyle: 'bold',
        halign: 'center'
      },
      didParseCell: (data) => {
        if(data.section === 'head' && data.row.index === 1) {
          data.cell.styles.fontStyle = 'normal';
          data.cell.styles.fillColor = [255, 255, 255];
          data.cell.styles.textColor = [40, 40, 40];
        }
      },
      tableWidth: CONTENT_WIDTH_MM,
      styles: {
        fontSize: BODY_FONT_SIZE,
        cellPadding: 2,
        halign: 'center',
        overflow: 'linebreak',
        lineWidth: 0.15,
        lineColor: [93, 93, 93]
      },
      columnStyles: {
        0: { halign: 'left' }
      },
      rowPageBreak: 'avoid'
    });
    return (pdf as any).lastAutoTable.finalY + SECTION_GAP_MM;
  }

  private async renderChartSection(pdf: jsPDF, section: ChartSection, currentY: number): Promise<number> {
    currentY = this.renderSectionTitle(pdf, section.title, currentY);

    let imageData: string | undefined;
    let imageAspectRatio: number = 2;

    if (section.imageDataProvider) {
      try {
        imageData = await section.imageDataProvider();
        imageAspectRatio = 2;
      }
      catch {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(BODY_FONT_SIZE);
        pdf.setTextColor(150, 0, 0);
        pdf.text('Failed to load chart image', PAGE_MARGIN_MM, currentY);
        return currentY + 10;
      }

      if (imageData) {
        const imageHeightMM = CONTENT_WIDTH_MM / imageAspectRatio;
        pdf.addImage(imageData, 'JPEG', PAGE_MARGIN_MM, currentY, CONTENT_WIDTH_MM, imageHeightMM);
        return currentY + imageHeightMM + SECTION_GAP_MM;
      }
    }
    return currentY;
  }

  private renderSectionTitle(pdf: jsPDF, title: string | undefined, currentY: number): number {
    if (!title) {
      return currentY;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(SECTION_HEADING_FONT_SIZE);
    pdf.setTextColor(...this.moduleColor);
    pdf.text(title, HALF_PAGE_WIDTH_MM, currentY, { align: 'center' });
    return currentY + 6;
  }
}
