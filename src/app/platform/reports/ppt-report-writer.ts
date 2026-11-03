import { Injectable } from '@angular/core';
import { PptDocument } from '@shared/report-output/ppt-document';
import { PptSlide, TitleSlide, TableSlide, ChartSlide, TableHeaderCell, ImageSlide } from '@shared/report-output/ppt-slide';
import { PPT_THEME } from '@shared/report-output/ppt-theme';
import { defineSlideMasters, SLIDE_MASTERS } from '@shared/report-output/ppt-slide-master';
import pptxgen from 'pptxgenjs';
import { projectTableHeaders, tableColumnBands } from '@shared/report-output/table-column-bands';

export interface PptReportOptions {
  readonly signal?: AbortSignal;
  readonly strictAssets?: boolean;
  readonly layout?: 'legacy' | 'wide';
  readonly minimumTableFontSize?: number;
  readonly onProgress?: (completed: number, total: number) => void;
}

@Injectable({ providedIn: 'root' })
export class PptReportWriter {
  async build(document: PptDocument, options: PptReportOptions = {}): Promise<Blob> {
    return new PresentationRenderer(options).build(document);
  }
}

class PresentationRenderer {
  private readonly wide: boolean;
  private readonly contentWidth: number;
  private readonly slideHeight: number;
  private readonly theme: typeof PPT_THEME;

  constructor(private readonly options: PptReportOptions) {
    this.wide = options.layout === 'wide';
    this.contentWidth = this.wide ? 12.333333 : 9;
    this.slideHeight = this.wide ? 7.5 : 5.625;
    const minimum = options.minimumTableFontSize ?? (this.wide ? 12 : 9);
    this.theme = this.wide ? {
      ...PPT_THEME,
      fonts: { heading: 'Arial', body: 'Arial' },
      sizes: { ...PPT_THEME.sizes, tableHeader: minimum, tableBody: minimum, caption: 10 },
      slide: { width: 13.333333, height: 7.5, margin: .4 },
      regions: { ...PPT_THEME.regions, fullContent: { x: .5, y: 1.3, w: this.contentWidth, h: 5.6 } }
    } : PPT_THEME;
  }

  async build(document: PptDocument): Promise<Blob> {
    this.options.signal?.throwIfAborted();
    const pptx = new pptxgen();
    // The previous PptxGenJS default is 10 × 5.625; retain it for legacy callers.
    pptx.layout = this.wide ? 'LAYOUT_WIDE' : 'LAYOUT_16x9';
    pptx.title = document.metadata.title;
    pptx.subject = document.metadata.subtitle || '';
    defineSlideMasters(pptx, this.wide);
    for (const [index, slideModel] of document.slides.entries()) {
      this.options.signal?.throwIfAborted();
      await this.addSlide(pptx, slideModel);
      this.options.onProgress?.(index + 1, document.slides.length);
    }
    this.options.signal?.throwIfAborted();
    const result = await pptx.write({ outputType: 'blob' });
    this.options.signal?.throwIfAborted();
    if (!(result instanceof Blob)) throw new Error('PowerPoint generation returned an unexpected file.');
    return result;
  }

  private async addSlide(pptx: pptxgen, slideModel: PptSlide): Promise<void> {
    switch (slideModel.type) {
      case 'title': this.addTitleSlide(pptx, slideModel); break;
      case 'table': this.addTableSlide(pptx, slideModel); break;
      case 'chart': this.addChartSlide(pptx, slideModel); break;
      case 'image': await this.addImageSlide(pptx, slideModel); break;
    }
  }

  private addTitleSlide(pptx: pptxgen, model: TitleSlide): void {
    if (this.wide) {
      const slide = pptx.addSlide({ masterName: SLIDE_MASTERS.BLANK });
      const titleOnly = model.layout === 'titleOnly';
      slide.addText(model.title, {
        x: .5, y: titleOnly ? .3 : 1.4, w: this.contentWidth, h: titleOnly ? 1 : 1.8,
        align: titleOnly ? 'left' : 'center', valign: 'middle',
        fontSize: model.titleFontSize ?? 32, fontFace: this.theme.fonts.heading, bold: true, color: '000000'
      });
      if (model.subtitle) slide.addText(model.subtitle, {
        x: .5, y: titleOnly ? 1.5 : 3.4, w: this.contentWidth, h: 1.7,
        align: titleOnly ? 'left' : 'center', valign: 'top',
        fontSize: model.subtitleFontSize ?? 18, fontFace: this.theme.fonts.body, color: this.theme.colors.text
      });
      if (model.date) slide.addText(new Date(model.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }), {
        x: .5, y: this.slideHeight - .7, w: this.contentWidth, h: .3, align: 'center',
        fontSize: 10, fontFace: this.theme.fonts.body, color: '666666'
      });
      return;
    }
    const hasCustomTitleSize = typeof model.titleFontSize === 'number';

    const defaultMasterName =
      model.layout === 'titleOnly' ? SLIDE_MASTERS.TITLE_ONLY :
        model.layout === 'section' ? SLIDE_MASTERS.SECTION :
          SLIDE_MASTERS.TITLE;

    const masterName = hasCustomTitleSize ? SLIDE_MASTERS.BLANK : defaultMasterName;
    const slide = pptx.addSlide({ masterName });

    if (hasCustomTitleSize) {
      const isSection = model.layout === 'section';

      slide.addText(model.title, {
        x: isSection ? 0.5 : 0.5,
        y: isSection ? 1.6 : 1.2,
        w: this.contentWidth,
        h: isSection ? 1.4 : 1.0,
        align: isSection ? 'center' : 'center',
        valign: 'middle',
        bold: true,
        fontFace: this.theme.fonts.heading,
        fontSize: model.titleFontSize,
        color: '000000'
      });

      if (model.subtitle) {
        slide.addText(model.subtitle, {
          x: 0.5,
          y: isSection ? 3.0 : 2.3,
          w: this.contentWidth,
          h: 1.4,
          align: 'center',
          valign: 'top',
          fontFace: this.theme.fonts.body,
          fontSize: model.subtitleFontSize ?? 12,
          color: '000000'
        });
      }

      if (model.date) {
        const formatted = new Date(model.date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        });
        slide.addText(formatted, {
          x: 0.5, y: this.slideHeight - .525, w: this.contentWidth, h: 0.3, align: 'center',
          fontFace: this.theme.fonts.body, fontSize: 10, color: '666666'
        });
      }
      return;
    }

    const titleText = model.title + (model.subtitle ? `\n${model.subtitle}` : '');
    slide.addText(titleText, { placeholder: 'title' });

    if (model.date) {
      const formatted = new Date(model.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      slide.addText(formatted, { placeholder: 'body' });
    }
  }

  private addTableSlide(pptx: pptxgen, model: TableSlide): void {
    if (this.wide) { this.addWideTable(pptx, model); return; }
    const slide = pptx.addSlide({ masterName: SLIDE_MASTERS.BLANK });

    slide.addText(model.title, { x: 0.5, y: 0.2, w: this.contentWidth, h: 1, align: 'left', bold: true, fontSize: 24, fontFace: this.theme.fonts.heading, color: '000000' });

    const { fullContent } = this.theme.regions;
    const firstPageY = 1.2;
    const overflowPageY = 0.4;

    const allRows: any[][] = [];
    allRows.push(this.buildHeaderRow(model.headers, this.theme.colors.primary, 'FFFFFF'));
    if (model.subHeaders?.length) {
      allRows.push(this.buildHeaderRow(model.subHeaders, this.theme.colors.background, '000000'));
    }

    model.rows.forEach((row, i) => {
      allRows.push(row.map(cell => ({
        text: String(cell),
        options: {
          align: 'center',
          fill: { color: i % 2 === 0 ? 'FFFFFF' : this.theme.colors.tableRowAlt },
          fontSize: this.theme.sizes.tableBody,
          color: this.theme.colors.text,
          fontFace: this.theme.fonts.body,
        },
      })));
    });

    slide.addTable(allRows, {
      x: fullContent.x,
      y: firstPageY,
      w: fullContent.w,
      colW: model.columnWidths,
      border: { type: 'solid', color: 'DDDDDD', pt: 0.5 },
      autoPage: true,
      autoPageSlideStartY: overflowPageY,
      autoPageRepeatHeader: true,
      autoPageHeaderRows: model.subHeaders?.length ? 2 : 1,
    });

    if (model.note) {
      slide.addText(model.note, {
        x: fullContent.x, y: 5.3, w: fullContent.w, h: 0.25,
        fontSize: this.theme.sizes.caption,
        color: this.theme.colors.textLight,
        italic: true,
        fontFace: this.theme.fonts.body,
      });
    }
  }

  private buildHeaderRow(cells: Array<string | TableHeaderCell>, bgColor?: string, textColor?: string): any[] {
    return cells.map(cell => {
      const isString = typeof cell === 'string';
      const text = isString ? cell : cell.content;
      const colSpan = !isString && cell.colspan > 1 ? cell.colspan : undefined;
      return {
        text,
        options: {
          bold: true,
          align: 'center',
          color: textColor,
          fill: { color: bgColor },
          fontSize: this.theme.sizes.tableHeader,
          fontFace: this.theme.fonts.body,
          ...(colSpan ? { colspan: colSpan } : {}),
          ...(!isString && cell.rowspan ? { rowspan: cell.rowspan } : {}),
        },
      };
    });
  }

  private addChartSlide(pptx: any, model: ChartSlide): void {
    if (this.options.strictAssets && model.series.some(series => series.data.some(value => !Number.isFinite(value)))) {
      throw new Error(`The chart for ${model.title} contains unavailable values. Use its image representation.`);
    }
    const slide = pptx.addSlide({ masterName: SLIDE_MASTERS.TITLE_ONLY });
    slide.addText(model.title, { placeholder: 'title' });

    const { fullContent } = this.theme.regions;
    const chartOpts: any = {
      x: fullContent.x,
      y: fullContent.y,
      w: fullContent.w,
      h: fullContent.h,
      showLegend: model.showLegend ?? true,
      legendPos: 'b',
      showDataLabels: model.showDataLabels ?? false,
      valAxisLabelFormatCode: model.valAxisLabelFormatCode ?? (model.yAxisUnit ? `#,##0 ${model.yAxisUnit}` : '#,##0'),
      valAxisTitle: model.yAxisUnit ?? '',
      showValAxisTitle: !!model.yAxisUnit,
      valAxisMinVal: model.valAxisMinVal ?? 0,
      valAxisMaxVal: model.valAxisMaxVal,
      valGridLine: { style: 'solid', color: 'E8E8E8', pt: 0.5 },
      fontFace: this.theme.fonts.body,
      ...(typeof model.valAxisMajorUnit === 'number' ? { valAxisMajorUnit: model.valAxisMajorUnit } : {}),
      barDir: model.barDir ?? 'col',
      barGapWidthPct: model.barGapWidthPct ?? 75,
      barGrouping: model.barGrouping ?? 'clustered',
    };

    if (model.chartType === 'combo') {
      const barSeries = model.series.filter(s => (s.type ?? 'bar') === 'bar');
      const lineSeries = model.series.filter(s => s.type === 'line');
      const areaSeries = model.series.filter(s => s.type === 'area');
      const charts: any[] = [];

      if (barSeries.length) {
        const comboBarColors = model.barColors?.length ? model.barColors : barSeries.map((s, i) => s.color ?? this.theme.chartPalette[i % this.theme.chartPalette.length]);
        charts.push({
          type: pptx.charts.BAR,
          data: barSeries.map(s => ({ name: s.name, labels: model.labels, values: s.data })),
          options: {
            chartColors: comboBarColors,
            barGrouping: model.barGrouping ?? 'clustered',
            barGapWidthPct: model.barGapWidthPct ?? 75
          },
        });
      }
      if (lineSeries.length) {
        charts.push({
          type: pptx.charts.LINE,
          data: lineSeries.map(s => ({ name: s.name, labels: model.labels, values: s.data })),
          options: {
            chartColors: lineSeries.map((s, i) =>
              s.color ?? this.theme.chartPalette[(barSeries.length + i) % this.theme.chartPalette.length]
            ),
            lineDataSymbol: 'circle',
            lineSize: 2,
          },
        });
      }
      if (areaSeries.length) {
        charts.push({
          type: pptx.charts.AREA,
          data: areaSeries.map(s => ({ name: s.name, labels: model.labels, values: s.data })),
          options: {
            chartColors: areaSeries.map((s, i) =>
              s.color ?? this.theme.chartPalette[(barSeries.length + lineSeries.length + i) % this.theme.chartPalette.length]
            ),
            barGrouping: 'stacked'
          },
        });
      }
      slide.addChart(charts as any, chartOpts);
    } else {
      const typeMap: Record<string, any> = {
        bar: pptx.charts.BAR,
        line: pptx.charts.LINE,
        area: pptx.charts.AREA,
      };
      const colors = model.barColors?.length ? model.barColors : model.series.map((s, i) => s.color ?? this.theme.chartPalette[i % this.theme.chartPalette.length]);

      const hasPerSeriesStyle = model.chartType === 'line' && model.series.some(s => s.lineDash || s.lineSize);

      if (hasPerSeriesStyle) {
        const charts = model.series.map((s, i) => ({
          type: pptx.charts.LINE,
          data: [{ name: s.name, labels: model.labels, values: s.data }],
          options: {
            chartColors: [s.color ?? this.theme.chartPalette[i % this.theme.chartPalette.length]],
            lineDataSymbol: 'none',
            lineSize: s.lineSize ?? 1.5,
            lineDash: s.lineDash ?? 'solid',
          },
        }));
        slide.addChart(charts as any, chartOpts);
      } else {
        const data = model.series.map(s => ({ name: s.name, labels: model.labels, values: s.data }));
        slide.addChart(typeMap[model.chartType], data, { ...chartOpts, chartColors: colors });
      }
    }
  }

  private addWideTable(pptx: pptxgen, model: TableSlide): void {
    const count = Math.max(...model.rows.map(row => row.length),
      model.headers.reduce((total, cell) => total + (typeof cell === 'string' ? 1 : cell.colspan ?? 1), 0));
    const bands = tableColumnBands(count, 7);
    for (const [index, columns] of bands.entries()) {
      const title = model.title + (bands.length > 1 ? ` (${index + 1}/${bands.length})` : '');
      const slide = pptx.addSlide({ masterName: SLIDE_MASTERS.BLANK });
      const headers = projectTableHeaders(model.headers, columns, cell => cell.colspan ?? 1, (cell, colspan) => ({ ...cell, colspan }));
      const rows = [this.buildHeaderRow(headers, this.theme.colors.primary, 'FFFFFF')];
      if (model.subHeaders?.length) {
        const subHeaders = projectTableHeaders(model.subHeaders, columns, cell => cell.colspan ?? 1, (cell, colspan) => ({ ...cell, colspan }));
        rows.push(this.buildHeaderRow(subHeaders, this.theme.colors.background, '000000'));
      }
      for (const [rowIndex, row] of model.rows.entries()) {
        rows.push(columns.map(column => ({ text: String(row[column] ?? ''), options: {
          align: column === 0 ? 'left' : 'center', fontSize: this.theme.sizes.tableBody,
          color: this.theme.colors.text, fontFace: this.theme.fonts.body,
          fill: { color: rowIndex % 2 ? this.theme.colors.tableRowAlt : 'FFFFFF' }
        } })));
      }
      const noteLines = wrappedLines(model.note ?? '', 150);
      const repeatedNote = noteLines.slice(0, 3).join('\n');
      const widths = model.columnWidths && columns.every(column => model.columnWidths[column] > 0)
        ? columns.map(column => model.columnWidths[column]) : undefined;
      const totalWidth = widths?.reduce((sum, width) => sum + width, 0);
      slide.addTable(rows, {
        x: .5, y: 1.25, w: this.contentWidth,
        colW: widths?.map(width => width / totalWidth! * this.contentWidth),
        margin: .06, fontSize: this.theme.sizes.tableBody,
        color: this.theme.colors.text, fontFace: this.theme.fonts.body,
        border: { type: 'solid', color: 'DDDDDD', pt: .5 },
        autoPage: true, autoPageSlideStartY: 1.25,
        autoPageRepeatHeader: true, autoPageHeaderRows: model.subHeaders?.length ? 2 : 1,
      });
      for (const [page, current] of [slide, ...slide.newAutoPagedSlides].entries()) {
        current.addText(title + (page ? ' — continued' : ''), {
          x: .5, y: .2, w: this.contentWidth, h: .85,
          fontSize: 24, bold: true, color: '000000', fontFace: this.theme.fonts.heading,
          breakLine: false, valign: 'middle'
        });
        if (repeatedNote) current.addText(repeatedNote, {
          x: .5, y: this.slideHeight - .8, w: this.contentWidth, h: .6,
          fontSize: this.theme.sizes.caption, color: this.theme.colors.textLight,
          fontFace: this.theme.fonts.body, valign: 'top'
        });
      }
      if (index === bands.length - 1 && noteLines.length > 3) {
        for (let start = 3; start < noteLines.length; start += 18) {
          const note = pptx.addSlide({ masterName: SLIDE_MASTERS.BLANK });
          note.addText(`${model.title} — notes continued`, { x: .5, y: .2, w: this.contentWidth, h: 1, fontSize: 24, bold: true });
          note.addText(noteLines.slice(start, start + 18).join('\n'), {
            x: .5, y: 1.3, w: this.contentWidth, h: 5.5, fontSize: 14, color: this.theme.colors.text,
            fontFace: this.theme.fonts.body, valign: 'top'
          });
        }
      }
    }
  }

  private imageBounds(data: string, model: ImageSlide, region: { x: number; y: number; w: number }, height: number): { x: number; y: number; w: number; h: number } {
    if (!this.wide) return { x: region.x, y: region.y, w: region.w, h: height };
    const dimensions = model.imageWidth && model.imageHeight ? { width: model.imageWidth, height: model.imageHeight } : pngDimensions(data);
    const ratio = dimensions ? dimensions.width / dimensions.height : 16 / 9;
    const imageHeight = Math.min(height, region.w / ratio);
    const imageWidth = imageHeight * ratio;
    return { x: region.x + (region.w - imageWidth) / 2, y: region.y, w: imageWidth, h: imageHeight };
  }

  private async addImageSlide(pptx: pptxgen, model: ImageSlide): Promise<void> {
    const imageData = model.imageDataProvider ? await model.imageDataProvider() : model.imageData;
    this.options.signal?.throwIfAborted();
    if (!imageData?.trim()) {
      if (this.options.strictAssets) throw new Error(`The image for ${model.title} is unavailable.`);
      return;
    }
    const slide = pptx.addSlide({ masterName: SLIDE_MASTERS.TITLE_ONLY });
    slide.addText(model.title, { placeholder: 'title' });
    const { fullContent } = this.theme.regions;
    const noteText = model.note?.trim();
    const noteHeight = noteText ? 0.3 : 0;
    const imageHeight = fullContent.h - noteHeight;
    slide.addImage({
      data: imageData,
      x: fullContent.x,
      y: fullContent.y,
      ...this.imageBounds(imageData, model, fullContent, imageHeight),
    });
    if (noteText) {
      slide.addText(noteText, {
        x: fullContent.x, 
        y: fullContent.y + imageHeight + 0.05, 
        w: fullContent.w, 
        h: 0.25,
        fontSize: this.theme.sizes.caption,
        color: this.theme.colors.textLight,
        italic: true,
        fontFace: this.theme.fonts.body,
      });
    }
  }
}

function wrappedLines(text: string, maximumLength: number): string[] {
  return text.split('\n').flatMap(paragraph => {
    if (!paragraph) return [''];
    const lines: string[] = [];
    let remaining = paragraph;
    while (remaining.length > maximumLength) {
      const space = remaining.lastIndexOf(' ', maximumLength);
      const boundary = space > 0 ? space : maximumLength;
      lines.push(remaining.slice(0, boundary));
      remaining = remaining.slice(boundary).trimStart();
    }
    lines.push(remaining);
    return lines;
  });
}

function pngDimensions(data: string): { width: number; height: number } | undefined {
  if (!data.startsWith('data:image/png;base64,')) return undefined;
  const bytes = atob(data.slice(data.indexOf(',') + 1, data.indexOf(',') + 49));
  if (bytes.length < 24) return undefined;
  const integer = (offset: number) => [0, 1, 2, 3].reduce((value, index) => value * 256 + bytes.charCodeAt(offset + index), 0);
  const width = integer(16), height = integer(20);
  return width > 0 && height > 0 ? { width, height } : undefined;
}
