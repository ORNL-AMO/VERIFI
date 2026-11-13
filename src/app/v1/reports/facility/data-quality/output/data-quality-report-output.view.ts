import { ReportDocument } from '@shared/report-output/report-document.model';
import { ChartSection, ReportSection } from '@shared/report-output/report-section.model';
import { V1EChartsOption } from '@app/v1/shared/charts/echarts';
import {
  meterQualityChartOption, meterQualityStatisticRows
} from '@app/v1/shared/data-quality/meter-quality-presentation/meter-quality-presentation.view';
import {
  predictorQualityChartOption, predictorQualityStatistics
} from '@app/v1/shared/data-quality/predictor-quality-presentation/predictor-quality-presentation.view';
import { dataQualityAnnualColumns, dataQualityAnnualRows } from '../annual-totals/data-quality-annual-totals.view';
import { DataQualityDotPlotInput, dataQualityDotPlotView } from '../dot-plot/data-quality-report-dot-plot.view';
import {
  DataQualityReportSnapshot, dataQualityReportMessages, dataQualityReportView
} from '../data-quality-report.view';
import { METER_CONTENT_FLAGS, PREDICTOR_CONTENT_FLAGS } from '../data-quality-report-settings';

export interface DataQualityPdfChart {
  readonly section: ChartSection;
  readonly option: V1EChartsOption;
}

export function dataQualityHasPdfContent(snapshot: DataQualityReportSnapshot): boolean {
  const { settings, results } = snapshot;
  return !!(results.meters.length && (settings.includeAnnualTotalsTable
    || METER_CONTENT_FLAGS.some(flag => settings[flag])))
    || !!(results.predictors.length && PREDICTOR_CONTENT_FLAGS.some(flag => settings[flag]));
}

/** Chart callbacks are attached by the output service after the shared controller clones the snapshot. */
export function dataQualityPdfDocument(snapshot: DataQualityReportSnapshot): {
  readonly document: Omit<ReportDocument, 'sections'> & { readonly sections: ReportSection[] };
  readonly charts: readonly DataQualityPdfChart[];
} {
  const sections: ReportSection[] = [], charts: DataQualityPdfChart[] = [];
  const messages = dataQualityReportMessages();
  const view = dataQualityReportView(snapshot.results, snapshot.settings);
  const text = (content: string, title?: string) => sections.push({ type: 'text', title, content });
  const heading = (title: string, kind: 'Meter' | 'Predictor') => sections.push({
    type: 'heading', title, pageBreakBefore: true, tocInclude: true, tocLabel: `${kind}: ${title}`, bookmarkLevel: 0
  });
  const table = (title: string, headers: string[], rows: string[][]) => sections.push({
    type: 'table', title, headers, rows, tocInclude: true, tocLabel: title, bookmarkLevel: 1
  });
  const chart = (title: string, option: V1EChartsOption | undefined, unavailable: string) => {
    if (!option) { text(unavailable, title); return; }
    const section: ChartSection = { type: 'chart', title, tocInclude: true, tocLabel: title, bookmarkLevel: 1 };
    sections.push(section);
    charts.push({ section, option });
  };
  const dotPlot = (title: string, input: DataQualityDotPlotInput | undefined) => {
    if (!input) return;
    const distribution = dataQualityDotPlotView(input);
    if (distribution.chartOption && input.notice) text(input.notice);
    chart(title, distribution.chartOption, distribution.message ?? 'No distribution is available.');
  };

  for (const meter of view.meters) {
    if (!snapshot.settings.includeAnnualTotalsTable && !METER_CONTENT_FLAGS.some(flag => snapshot.settings[flag])) {
      continue;
    }
    const { report, content } = meter;
    heading(report.meter.name, 'Meter');
    if (!report.hasData) text(messages.noMeterReadings);
    else {
      for (const evidence of meter.evidence) text(evidence);
      if (content.statistics) {
        const rows = meterQualityStatisticRows(report, true);
        const title = 'Total Consumption and Cost Statistics';
        if (!rows.length) text('No statistics are available for this meter.', title);
        else table(title, ['Metric', ...rows[0].cells.map(cell => cell.label)],
          rows.map(row => [row.label, ...row.cells.map(cell => cell.valueLabel)]));
      }
      if (content.consumptionTimeseries) chart('Total Consumption', meterQualityChartOption(report, {
        cost: false, includeExcludedConsumption: true, showExpectedRangeLabel: false
      }), 'No readings have usable consumption values and valid dates for the time series.');
      if (content.costTimeseries) chart('Total Cost', meterQualityChartOption(report, {
        consumption: false, showExpectedRangeLabel: false
      }), 'No readings have usable costs and valid dates for the time series.');
      dotPlot('Consumption distribution', meter.consumptionDotPlot);
      if (content.excludedConsumption) text(messages.excludedConsumption);
      dotPlot('Cost distribution', meter.costDotPlot);
      if (content.costUnavailable) text(messages.costUnavailable, messages.costUnavailableTitle);
    }
    if (snapshot.settings.includeAnnualTotalsTable) {
      const totals = meter.annualTotals;
      if (!totals?.rows.length) text('No calendarized readings are available for annual totals.', 'Annual Totals');
      else {
        const columns = dataQualityAnnualColumns(totals);
        const rows = dataQualityAnnualRows(totals.columns, [...totals.rows].sort((a, b) => a.year - b.year));
        table('Annual Totals', columns.map(column => {
          const unit = column.unitHtml ? plainUnit(column.unitHtml) : column.unit;
          return unit ? `${column.label} (${unit})` : column.label;
        }), rows.map(row => row.cells.map(cell => cell.text)));
      }
    }
  }
  for (const predictor of view.predictors) {
    if (!PREDICTOR_CONTENT_FLAGS.some(flag => snapshot.settings[flag])) continue;
    const { report, content } = predictor;
    heading(report.predictor.name, 'Predictor');
    if (predictor.weatherDescription) text(predictor.weatherDescription);
    if (!report.hasData) { text(messages.noPredictorReadings); continue; }
    for (const evidence of predictor.evidence) text(evidence);
    if (!report.hasUsableData) { text(messages.noPredictorValues); continue; }
    if (content.statistics) {
      const cells = predictorQualityStatistics(report, true);
      const metric = report.unit ? `Predictor Values (${report.unit})` : 'Predictor Values';
      table('Predictor Consumption Statistics', ['Metric', ...cells.map(cell => cell.label)],
        [[metric, ...cells.map(cell => cell.valueLabel)]]);
    }
    if (content.timeseries) chart('Predictor Readings', predictorQualityChartOption(report, false),
      messages.noPredictorPeriods);
    dotPlot('Predictor value distribution', predictor.dotPlot);
  }
  // The shared PDF font supports Latin characters; spell out subscripts and normalize typographic dashes.
  for (const section of sections) {
    if (section.title) section.title = pdfText(section.title);
    if (section.tocLabel) section.tocLabel = pdfText(section.tocLabel);
    if (section.type === 'text') section.content = pdfText(section.content);
    if (section.type === 'table') {
      section.headers = section.headers.map(header => typeof header === 'string' ? pdfText(header) : header);
      section.rows = section.rows.map(row => row.map(pdfText));
    }
  }
  return {
    document: { metadata: { title: pdfText(snapshot.name), facilityName: pdfText(snapshot.facility.name),
      subtitle: `${pdfText(snapshot.facility.name)} - Data Quality - All selected reading history`,
      dateGenerated: new Date().toISOString() }, sections }, charts
  };
}

function plainUnit(html: string): string {
  return html.replace(/<sup>(.*?)<\/sup>/gi, '^$1').replace(/<[^>]*>/g, '')
    .replace(/&#(x[\da-f]+|\d+);?/gi, (entity, code: string) => {
      const value = code.toLowerCase().startsWith('x') ? parseInt(code.slice(1), 16) : Number(code);
      return value <= 0x10ffff ? String.fromCodePoint(value) : entity;
    })
    .replace(/&deg;/g, '°').replace(/&sup2;/g, '²').replace(/&sup3;/g, '³').replace(/&nbsp;/g, ' ');
}

function pdfText(value: string): string {
  return value.replace(/[₀-₉]/g, digit => String(digit.charCodeAt(0) - 0x2080))
    .replace(/[–—−]/g, '-');
}
