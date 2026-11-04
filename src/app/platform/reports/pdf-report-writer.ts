import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportDocument } from '@shared/report-output/report-document.model';
import {
  BaseSection, ChartSection, HeadingSection, ImageSection, StyledTextSection, TableSection, TextSection
} from '@shared/report-output/report-section.model';
import { projectTableHeaders, tableColumnBands } from '@shared/report-output/table-column-bands';

export interface PdfReportOptions {
  readonly signal?: AbortSignal;
  readonly strictAssets?: boolean;
  readonly orientation?: 'portrait' | 'landscape';
  readonly format?: 'a4' | 'letter';
  readonly onProgress?: (completed: number, total: number) => void;
}

@Injectable({ providedIn: 'root' })
export class PdfReportWriter {
  async build(document: ReportDocument, options: PdfReportOptions = {}): Promise<Blob> {
    return new PdfDocumentRenderer(document, options).build();
  }
}

const MARGIN = 15;
const GAP = 8;
const BODY_SIZE = 9;

/** Rendering state belongs to one file, including when one image provider awaits another operation. */
class PdfDocumentRenderer {
  private readonly pdf: jsPDF;
  private readonly color: [number, number, number];
  private readonly width: number;
  private readonly height: number;
  private readonly contentWidth: number;
  private currentY = MARGIN;
  private sectionStartPage?: number;
  private readonly bookmarks: { label: string; page: number; level?: number }[] = [];

  constructor(private readonly document: ReportDocument, private readonly options: PdfReportOptions) {
    this.pdf = new jsPDF({ orientation: options.orientation ?? 'landscape', unit: 'mm', format: options.format ?? 'a4', compress: true });
    this.width = this.pdf.internal.pageSize.getWidth();
    this.height = this.pdf.internal.pageSize.getHeight();
    this.contentWidth = this.width - MARGIN * 2;
    this.color = document.metadata.moduleColor ?? [30, 90, 140];
  }

  async build(): Promise<Blob> {
    this.options.signal?.throwIfAborted();
    this.pdf.setProperties({ title: this.document.metadata.title, subject: this.document.metadata.subtitle ?? '' });
    if (!this.document.metadata.skipPage) this.cover();
    for (const [index, section] of this.document.sections.entries()) {
      this.options.signal?.throwIfAborted();
      if (section.pageBreakBefore && (!this.options.strictAssets || this.currentY > MARGIN)) this.newPage();
      this.ensureSpace(section.type === 'heading' ? 42 : 25);
      const initialPage = this.pdf.getCurrentPageInfo().pageNumber;
      this.sectionStartPage = undefined;
      await this.section(section);
      if (section.tocInclude && section.tocLabel) this.bookmarks.push({ label: section.tocLabel,
        page: this.sectionStartPage ?? initialPage, level: section.bookmarkLevel });
      if (section.pageBreakAfter && index < this.document.sections.length - 1) this.newPage();
      this.options.onProgress?.(index + 1, this.document.sections.length);
    }
    this.options.signal?.throwIfAborted();
    this.addBookmarks();
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(120, 120, 120);
    for (let page = 1; page <= this.pdf.getNumberOfPages(); page++) {
      this.pdf.setPage(page);
      this.pdf.text(String(page), this.width - MARGIN, this.height - 6, { align: 'right' });
    }
    return this.pdf.output('blob');
  }

  private cover(): void {
    const meta = this.document.metadata;
    this.currentY = this.height / 2 - 15;
    this.text(meta.title, 18, true, this.color, 'center');
    if (meta.subtitle) this.text(meta.subtitle, 12, false, [60, 60, 60], 'center');
    if (meta.dateGenerated) this.text(`Generated: ${new Date(meta.dateGenerated).toLocaleDateString('en-US', { dateStyle: 'long' })}`,
      BODY_SIZE, false, [100, 100, 100], 'center');
    this.newPage();
  }

  private async section(section: BaseSection): Promise<void> {
    switch (section.type) {
      case 'heading': this.heading(section as HeadingSection); break;
      case 'text': {
        this.sectionTitle(section.title);
        this.text((section as TextSection).content, BODY_SIZE, false);
        this.currentY += GAP;
        break;
      }
      case 'styledText': {
        const styled = section as StyledTextSection;
        if (styled.verticalCenter) {
          const blockHeight = styled.content.reduce((sum, line) => sum + (line.spaceAfter ?? (line.fontSize ?? BODY_SIZE) * .5), 0);
          this.currentY = Math.max(MARGIN, this.height / 2 - blockHeight / 2);
        }
        for (const line of styled.content) {
          this.text(line.text, line.fontSize ?? BODY_SIZE, line.bold ?? false, line.color, line.align, line.spaceAfter);
        }
        this.currentY += GAP;
        break;
      }
      case 'table': this.table(section as TableSection); break;
      case 'chart': case 'image': await this.image(section as ChartSection | ImageSection); break;
    }
  }

  private text(value: string, fontSize: number, bold: boolean, color: [number, number, number] = [40, 40, 40],
    align: 'left' | 'center' | 'right' = 'left', spaceAfter?: number): void {
    this.pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    this.pdf.setFontSize(fontSize);
    this.pdf.setTextColor(...color);
    const lines = this.pdf.splitTextToSize(value, this.contentWidth) as string[];
    const lineHeight = fontSize * .42;
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.markSectionStart();
      const x = align === 'center' ? this.width / 2 : align === 'right' ? this.width - MARGIN : MARGIN;
      this.pdf.text(line, x, this.currentY, { align });
      this.currentY += lineHeight;
    }
    if (spaceAfter != null) this.currentY += Math.max(0, spaceAfter - lineHeight);
  }

  private heading(section: HeadingSection): void {
    this.text(section.title ?? '', 14, true, [40, 40, 40], 'center');
    this.pdf.setDrawColor(40, 40, 40);
    this.pdf.setLineWidth(.5);
    this.pdf.line(MARGIN, this.currentY, this.width - MARGIN, this.currentY);
    this.currentY += GAP;
  }

  private sectionTitle(title?: string): void {
    if (!title) return;
    this.text(title, 11, true, this.color, 'center');
    this.currentY += 2;
  }

  private table(section: TableSection): void {
    const columnCount = Math.max(0, ...section.rows.map(row => row.length),
      section.headers.reduce((sum, cell) => sum + (typeof cell === 'string' ? 1 : cell.colSpan ?? 1), 0));
    const bands = tableColumnBands(columnCount, this.options.strictAssets ? Math.max(3, Math.floor(this.contentWidth / 27)) : Math.max(2, columnCount));
    for (const [bandIndex, columns] of bands.entries()) {
      if (bandIndex) this.newPage();
      this.sectionTitle(section.title ? section.title + (bands.length > 1 ? ` (${bandIndex + 1}/${bands.length})` : '') : undefined);
      const headers = projectTableHeaders(section.headers, columns, cell => cell.colSpan ?? 1, (cell, colSpan) => ({ ...cell, colSpan }));
      const subHeaders = section.subHeaders?.length
        ? projectTableHeaders(section.subHeaders, columns, cell => cell.colSpan ?? 1, (cell, colSpan) => ({ ...cell, colSpan })) : undefined;
      let firstPage = true;
      autoTable(this.pdf, {
        head: subHeaders ? [headers, subHeaders] : [headers],
        body: section.rows.map(row => columns.map(index => row[index] ?? '')),
        startY: this.currentY,
        margin: { left: MARGIN, right: MARGIN, top: MARGIN + (section.title && this.options.strictAssets ? 8 : 0), bottom: MARGIN },
        tableWidth: this.contentWidth,
        showHead: 'everyPage', rowPageBreak: 'avoid',
        headStyles: { fillColor: this.color, fontSize: BODY_SIZE, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: BODY_SIZE, cellPadding: 2, halign: 'center', overflow: 'linebreak', lineWidth: .15, lineColor: [93, 93, 93] },
        columnStyles: { 0: { halign: 'left' } },
        willDrawCell: () => this.markSectionStart(),
        didParseCell: data => {
          if (data.section === 'head' && data.row.index === 1) {
            data.cell.styles.fontStyle = 'normal'; data.cell.styles.fillColor = [255, 255, 255]; data.cell.styles.textColor = [40, 40, 40];
          }
        },
        willDrawPage: () => {
          if (!firstPage && section.title && this.options.strictAssets) {
            const y = this.currentY;
            this.currentY = MARGIN;
            this.sectionTitle(`${section.title} — continued`);
            this.currentY = y;
          }
          firstPage = false;
        }
      });
      this.currentY = (this.pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + GAP;
    }
  }

  private async image(section: ChartSection | ImageSection): Promise<void> {
    let data: string | undefined;
    try {
      data = section.type === 'image' ? section.imageData : undefined;
      if (section.imageDataProvider) data = await section.imageDataProvider();
      this.options.signal?.throwIfAborted();
      if (!data?.trim()) {
        if (this.options.strictAssets) throw new Error(`The image for ${section.title ?? 'a report section'} is unavailable.`);
        return;
      }
      const properties = this.pdf.getImageProperties(data);
      const ratio = this.options.strictAssets || section.type === 'image' ? properties.width / properties.height : 2;
      const maximumHeight = this.height - MARGIN * 2 - (section.title ? 14 : 0);
      const imageHeight = Math.min(this.contentWidth / ratio, maximumHeight);
      const imageWidth = imageHeight * ratio;
      this.ensureSpace(imageHeight + (section.title ? 10 : 0));
      this.markSectionStart();
      this.sectionTitle(section.title);
      this.pdf.addImage(data, properties.fileType, (this.width - imageWidth) / 2, this.currentY, imageWidth, imageHeight);
      this.currentY += imageHeight + GAP;
    } catch (error) {
      this.options.signal?.throwIfAborted();
      if (this.options.strictAssets) throw error;
      this.text('Failed to load chart image', BODY_SIZE, false, [150, 0, 0]);
      this.currentY += GAP;
    }
  }

  private ensureSpace(height: number): void {
    if (this.currentY + height > this.height - MARGIN) this.newPage();
  }
  /** Capture the first painted page, including pagination performed by AutoTable. */
  private markSectionStart(): void {
    this.sectionStartPage ??= this.pdf.getCurrentPageInfo().pageNumber;
  }
  private newPage(): void { this.pdf.addPage(); this.currentY = MARGIN; }
  private addBookmarks(): void {
    let parent: unknown = null;
    for (const entry of this.bookmarks) {
      const outline = this.pdf.outline;
      if (!entry.level) parent = outline.add(null, entry.label, { pageNumber: entry.page });
      else outline.add(parent, entry.label, { pageNumber: entry.page });
    }
  }
}
