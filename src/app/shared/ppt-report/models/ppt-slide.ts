export type PptSlide = TitleSlide | TableSlide | ChartSlide;

export interface TableHeaderCell {
    content: string;
    colspan?: number;
}

export interface TitleSlide {
    type: 'title';
    title: string;
    subtitle?: string;
    date?: string;
}

export interface TableSlide {
    type: 'table';
    title: string;
    headers: Array<string | TableHeaderCell>;
    subHeaders?: Array<string | TableHeaderCell>;
    rows: Array<Array<string | number>>;
    note?: string;
}

export interface ChartSlide {
    type: 'chart';
    title: string;
    chartType: 'bar' | 'line' | 'area' | 'combo';
    labels: Array<string>;
    series: PptChartSeries[];
    yAxisUnit?: string;
    valAxisLabelFormatCode?: string;
    valAxisMinVal?: number;
    valAxisMajorUnit?: number;
    showLegend?: boolean;
    showDataLabels?: boolean;
    lineDash?: 'solid' | 'dash' | 'dot';
    note?: string;
}

export interface PptChartSeries {
    name: string;
    data: Array<number>;
    type?: 'bar' | 'line' | 'area';
    color?: string;
    lineDash?: 'solid' | 'dash' | 'dot' | 'dashDot';
    lineSize?: number;
}
