import { PlotlyService } from 'angular-plotly.js';

export interface ChartImageOptions {
    format?: 'jpeg' | 'png';
    width?: number;
    height?: number;
}

export async function chartToImage(plotlyService: PlotlyService, chartElement: HTMLElement | null | undefined, options?: ChartImageOptions): Promise<string> {
    if (!chartElement) {
        return '';
    }

    try {
        const plotly = await plotlyService.getPlotly();

        if (!plotly || typeof plotly.toImage !== 'function') {
            return '';
        }

        return await plotly.toImage(chartElement, {
            format: options?.format ?? 'jpeg',
            width: options?.width ?? 1400,
            height: options?.height ?? 700,
            imageDataOnly: false
        });
    } catch {
        return '';
    }
}