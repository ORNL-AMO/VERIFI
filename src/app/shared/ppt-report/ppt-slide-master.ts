import { PPT_THEME } from './ppt-theme';

export const SLIDE_MASTERS = {
  TITLE:         'Title Slide',
  TITLE_ONLY:    'Title Only',
  TITLE_CONTENT: 'Title and Content',
  SECTION:       'SubTitle Slide',
  BLANK:         'Blank Slide',
} as const;

export function defineSlideMasters(pptx: any): void {
  pptx.defineSlideMaster({
    title: SLIDE_MASTERS.TITLE,
    objects: [
      {
        placeholder: {
          options: {
            name: 'title', type: 'title',
            x: 0.5, y: 1.5, w: 9, h: 1.5,
            align: 'center', bold: true,
            color: '000000', fontSize: 32,
            fontFace: PPT_THEME.fonts.heading,
          },
          text: 'Click to add title',
        },
      },
      {
        placeholder: {
          options: {
            name: 'body', type: 'body',
            x: 0.5, y: 3.07, w: 9, h: 1,
            align: 'center',
            color: '000000', fontSize: 18,
            fontFace: PPT_THEME.fonts.body,
          },
          text: 'Click to add subtitle',
        },
      },
    ],
    margin: 0.0,
  });

  pptx.defineSlideMaster({
    title: SLIDE_MASTERS.TITLE_ONLY,
    objects: [
      {
        placeholder: {
          options: {
            name: 'title', type: 'title',
            x: 0.5, y: 0.2, w: 9, h: 1,
            align: 'left', bold: true, valign: 'middle',
            color: '000000', fontSize: 24,
            fontFace: PPT_THEME.fonts.heading,
          },
          text: 'Click to add title',
        },
      },
    ],
    margin: 0.0,
  });

  pptx.defineSlideMaster({
    title: SLIDE_MASTERS.TITLE_CONTENT,
    objects: [
      {
        placeholder: {
          options: {
            name: 'title', type: 'title',
            x: 0.5, y: 0.2, w: 9, h: 1,
            align: 'left', bold: true, valign: 'middle',
            color: '000000', fontSize: 24,
            fontFace: PPT_THEME.fonts.heading,
          },
          text: 'Click to add title',
        },
      },
      {
        placeholder: {
          options: {
            name: 'body', type: 'body',
            x: 0.5, y: 1.3, w: 9, h: 4,
            align: 'left', valign: 'top',
            color: '000000', fontSize: 16,
            fontFace: PPT_THEME.fonts.body,
            bullet: true,
          },
          text: 'Click to add text',
        },
      },
    ],
    margin: 0.0,
  });

  pptx.defineSlideMaster({
    title: SLIDE_MASTERS.SECTION,
    objects: [
      {
        placeholder: {
          options: {
            name: 'title', type: 'title',
            x: 0, y: 2, w: 10, h: 1,
            align: 'center', bold: true, valign: 'middle',
            color: '000000', fontSize: 24,
            fontFace: PPT_THEME.fonts.heading,
          },
          text: 'Click to add title',
        },
      },
    ],
  });

  pptx.defineSlideMaster({
    title: SLIDE_MASTERS.BLANK,
    objects: [],
    margin: 0.0,
  });
}