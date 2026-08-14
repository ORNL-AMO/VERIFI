import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';

export type P1OverviewChartKind = 'trend' | 'mix' | 'readiness';

export interface P1OverviewChartSeries {
  name: string;
  values: Array<number>;
  colorToken?: string;
  colorTokens?: Array<string>;
}

export interface P1OverviewChartConfig {
  kind: P1OverviewChartKind;
  title: string;
  subtitle: string;
  labels: Array<string>;
  unit: string;
  series: Array<P1OverviewChartSeries>;
}

interface P1OverviewChartStyles {
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
}

@Component({
  selector: 'app-p1-overview-chart',
  templateUrl: './overview-chart.component.html',
  styleUrls: ['./overview-chart.component.css'],
  standalone: false
})
export class P1OverviewChartComponent implements AfterViewInit, OnChanges {
  @Input({ required: true }) config: P1OverviewChartConfig;
  @Input() themeSignature = '';

  @ViewChild('chartElement') chartElement: ElementRef<HTMLDivElement>;

  constructor(private plotlyService: PlotlyService) { }

  ngAfterViewInit(): void {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes.config && !changes.config.isFirstChange()) || (changes.themeSignature && !changes.themeSignature.isFirstChange())) {
      this.drawChart();
    }
  }

  private drawChart(): void {
    if (!this.chartElement?.nativeElement || !this.config) {
      return;
    }
    const styles = this.getPrototypeStyles();
    const data = this.getData(styles);
    const layout: any = {
      title: {
        text: this.config.title,
        font: {
          color: styles.text,
          size: 16
        },
        x: 0,
        xanchor: 'left'
      },
      paper_bgcolor: styles.surface,
      plot_bgcolor: styles.surface,
      font: {
        color: styles.text,
        family: 'Arial, sans-serif'
      },
      margin: { t: 46, r: 18, b: this.config.kind === 'trend' ? 42 : 34, l: this.config.kind === 'mix' ? 92 : 42 },
      xaxis: {
        color: styles.muted,
        gridcolor: styles.border,
        zerolinecolor: styles.border,
        title: this.config.kind === 'mix' ? this.config.unit : undefined
      },
      yaxis: {
        color: styles.muted,
        gridcolor: this.config.kind === 'mix' ? styles.border : 'rgba(0,0,0,0)',
        zerolinecolor: styles.border,
        title: this.config.kind === 'trend' ? this.config.unit : undefined,
        automargin: true
      },
      legend: {
        orientation: 'h',
        x: 0,
        y: -0.2
      },
      showlegend: this.config.kind === 'trend'
    };
    const plotlyConfig: any = {
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.chartElement.nativeElement, data, layout, plotlyConfig);
  }

  private getData(styles: P1OverviewChartStyles): Array<any> {
    if (this.config.kind === 'trend') {
      return this.config.series.map(series => ({
        type: 'scatter',
        mode: 'lines+markers',
        x: this.config.labels,
        y: series.values,
        name: series.name,
        line: {
          color: this.cssColor(series.colorToken, styles.accent),
          width: 3
        },
        marker: {
          color: this.cssColor(series.colorToken, styles.accent),
          size: 6
        },
        hovertemplate: `${series.name}: %{y:,.0f} ${this.config.unit}<extra></extra>`
      }));
    }
    const series = this.config.series[0];
    return [{
      type: 'bar',
      orientation: this.config.kind === 'mix' ? 'h' : 'v',
      x: this.config.kind === 'mix' ? series.values : this.config.labels,
      y: this.config.kind === 'mix' ? this.config.labels : series.values,
      marker: {
        color: (series.colorTokens || []).map(token => this.cssColor(token, styles.accent))
      },
      text: series.values.map(value => value.toLocaleString()),
      textposition: 'auto',
      hovertemplate: this.config.kind === 'mix'
        ? '%{y}: %{x:,.0f}<extra></extra>'
        : '%{x}: %{y:,.0f}<extra></extra>'
    }];
  }

  private getPrototypeStyles(): P1OverviewChartStyles {
    const root = this.chartElement.nativeElement.closest('.p1-prototype') || document.documentElement;
    const style = getComputedStyle(root);
    return {
      surface: this.readCssVar(style, '--prototype-surface'),
      text: this.readCssVar(style, '--prototype-text'),
      muted: this.readCssVar(style, '--prototype-muted'),
      border: this.readCssVar(style, '--prototype-border'),
      accent: this.readCssVar(style, '--prototype-accent')
    };
  }

  private cssColor(token: string | undefined, fallback: string): string {
    if (!token) {
      return fallback;
    }
    const root = this.chartElement.nativeElement.closest('.p1-prototype') || document.documentElement;
    const color = getComputedStyle(root).getPropertyValue(token).trim();
    return color || fallback;
  }

  private readCssVar(style: CSSStyleDeclaration, name: string): string {
    return style.getPropertyValue(name).trim();
  }
}
