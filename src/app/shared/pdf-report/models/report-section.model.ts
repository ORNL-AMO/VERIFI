export type ReportSectionType = 'text' | 'heading' | 'table' | 'chart'; 

export interface BaseSection {
    type: ReportSectionType;
    title?: string;
    pageBreakBefore?: boolean;
}

export interface TextSection extends BaseSection {
    type: 'text';
    content: string;
}

export interface HeadingSection extends BaseSection {
    type: 'heading';
}

export interface TableSection extends BaseSection {
    type: 'table';
    headers: string[];
    rows: string[][];
}

export interface ChartSection extends BaseSection {
    type: 'chart';
    imageDataProvider?: () => Promise<string>;
}

