export type ReportSectionType = 'text' | 'heading' | 'table' | 'chart' | 'styledText'; 

export interface BaseSection {
    type: ReportSectionType;
    title?: string;
    pageBreakBefore?: boolean;
    pageBreakAfter?: boolean;
    tocInclude?: boolean;
    tocLabel?: string;
    bookmarkLevel?: number;
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
    headers: Array<string | TableHeaderCell>;
    subHeaders?: Array<string | TableHeaderCell>;
    rows: string[][];
}

export interface ChartSection extends BaseSection {
    type: 'chart';
    imageDataProvider?: () => Promise<string>;
}

export interface TableHeaderCell {
    content: string;
    colSpan?: number;
    rowSpan?: number;
}

export interface StyledTextSection extends BaseSection {
    type: 'styledText';
    content: StyledText[];
    verticalCenter?: boolean;
}

export interface StyledText {
    text: string;
    fontSize?: number;
    color?: [number, number, number];
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
    spaceAfter?: number;
}

