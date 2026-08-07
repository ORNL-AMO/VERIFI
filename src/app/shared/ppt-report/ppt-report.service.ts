import { Injectable } from '@angular/core';
import { PptDocument } from './models/ppt-document';
import { PptSlide, TitleSlide, TableSlide, ChartSlide, TableHeaderCell, ImageSlide } from './models/ppt-slide';
import { PPT_THEME } from './ppt-theme';
import { defineSlideMasters, SLIDE_MASTERS } from './ppt-slide-master';
import pptxgen from 'pptxgenjs';

@Injectable({ providedIn: 'root' })
export class PptReportService {

  async buildPowerpoint(document: PptDocument, fileName: string): Promise<void> {
    const pptx = new pptxgen();
    pptx.title = document.metadata.title;
    pptx.subject = document.metadata.subtitle || '';

    defineSlideMasters(pptx);

    for (const slideModel of document.slides) {
      this.addSlide(pptx, slideModel);
    }
    await pptx.writeFile({ fileName: fileName });
  }

  private addSlide(pptx: pptxgen, slideModel: PptSlide): void {
    switch (slideModel.type) {
      case 'title': this.addTitleSlide(pptx, slideModel); break;
      case 'table': this.addTableSlide(pptx, slideModel); break;
      case 'chart': this.addChartSlide(pptx, slideModel); break;
      case 'image': this.addImageSlide(pptx, slideModel); break;
    }
  }

  private addTitleSlide(pptx: pptxgen, model: TitleSlide): void {
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
        w: 9,
        h: isSection ? 1.4 : 1.0,
        align: isSection ? 'center' : 'center',
        valign: 'middle',
        bold: true,
        fontFace: PPT_THEME.fonts.heading,
        fontSize: model.titleFontSize,
        color: '000000'
      });

      if (model.subtitle) {
        slide.addText(model.subtitle, {
          x: 0.5,
          y: isSection ? 3.0 : 2.3,
          w: 9,
          h: 1.4,
          align: 'center',
          valign: 'top',
          fontFace: PPT_THEME.fonts.body,
          fontSize: model.subtitleFontSize ?? 12,
          color: '000000'
        });
      }

      if (model.date) {
        const formatted = new Date(model.date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        });
        slide.addText(formatted, {
          x: 0.5, y: 5.1, w: 9, h: 0.3, align: 'center',
          fontFace: PPT_THEME.fonts.body, fontSize: 10, color: '666666'
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
    const slide = pptx.addSlide({ masterName: SLIDE_MASTERS.BLANK });

    slide.addText(model.title, { x: 0.5, y: 0.2, w: 9, h: 1, align: 'left', bold: true, fontSize: 24, fontFace: PPT_THEME.fonts.heading, color: '000000' });

    const { fullContent } = PPT_THEME.regions;
    const firstPageY = 1.2;
    const overflowPageY = 0.4;

    const allRows: any[][] = [];
    allRows.push(this.buildHeaderRow(model.headers, PPT_THEME.colors.primary, 'FFFFFF'));
    if (model.subHeaders?.length) {
      allRows.push(this.buildHeaderRow(model.subHeaders, PPT_THEME.colors.background, '000000'));
    }

    model.rows.forEach((row, i) => {
      allRows.push(row.map(cell => ({
        text: String(cell),
        options: {
          align: 'center',
          fill: { color: i % 2 === 0 ? 'FFFFFF' : PPT_THEME.colors.tableRowAlt },
          fontSize: PPT_THEME.sizes.tableBody,
          color: PPT_THEME.colors.text,
          fontFace: PPT_THEME.fonts.body,
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
        fontSize: PPT_THEME.sizes.caption,
        color: PPT_THEME.colors.textLight,
        italic: true,
        fontFace: PPT_THEME.fonts.body,
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
          fontSize: PPT_THEME.sizes.tableHeader,
          fontFace: PPT_THEME.fonts.body,
          ...(colSpan ? { colspan: colSpan } : {}),
        },
      };
    });
  }

  private addChartSlide(pptx: any, model: ChartSlide): void {
    const slide = pptx.addSlide({ masterName: SLIDE_MASTERS.TITLE_ONLY });
    slide.addText(model.title, { placeholder: 'title' });

    const { fullContent } = PPT_THEME.regions;
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
      fontFace: PPT_THEME.fonts.body,
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
        const comboBarColors = model.barColors?.length ? model.barColors : barSeries.map((s, i) => s.color ?? PPT_THEME.chartPalette[i % PPT_THEME.chartPalette.length]);
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
              s.color ?? PPT_THEME.chartPalette[(barSeries.length + i) % PPT_THEME.chartPalette.length]
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
              s.color ?? PPT_THEME.chartPalette[(barSeries.length + lineSeries.length + i) % PPT_THEME.chartPalette.length]
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
      const colors = model.barColors?.length ? model.barColors : model.series.map((s, i) => s.color ?? PPT_THEME.chartPalette[i % PPT_THEME.chartPalette.length]);

      const hasPerSeriesStyle = model.chartType === 'line' && model.series.some(s => s.lineDash || s.lineSize);

      if (hasPerSeriesStyle) {
        const charts = model.series.map((s, i) => ({
          type: pptx.charts.LINE,
          data: [{ name: s.name, labels: model.labels, values: s.data }],
          options: {
            chartColors: [s.color ?? PPT_THEME.chartPalette[i % PPT_THEME.chartPalette.length]],
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

  private addImageSlide(pptx: pptxgen, model: ImageSlide): void {
    if (!model.imageData?.trim()) {
      return;
    }
    const slide = pptx.addSlide({ masterName: SLIDE_MASTERS.TITLE_ONLY });
    slide.addText(model.title, { placeholder: 'title' });
    const { fullContent } = PPT_THEME.regions;
    const noteText = model.note?.trim();
    const noteHeight = noteText ? 0.3 : 0;
    const imageHeight = fullContent.h - noteHeight;
    slide.addImage({
      data: model.imageData,
      x: fullContent.x,
      y: fullContent.y,
      w: fullContent.w,
      h: imageHeight,
    });
    if (noteText) {
      slide.addText(noteText, {
        x: fullContent.x, 
        y: fullContent.y + imageHeight + 0.05, 
        w: fullContent.w, 
        h: 0.25,
        fontSize: PPT_THEME.sizes.caption,
        color: PPT_THEME.colors.textLight,
        italic: true,
        fontFace: PPT_THEME.fonts.body,
      });
    }
  }
}