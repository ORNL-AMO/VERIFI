import { PptSlide } from "./ppt-slide";

export interface PptDocument {
    metadata: PptMetadata;
    slides: Array<PptSlide>;
}

export interface PptMetadata {
    title: string;
    subtitle?: string;
    date?: string;
}

export { PptSlide };
