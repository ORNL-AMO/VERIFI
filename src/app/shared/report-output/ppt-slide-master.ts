import { PPT_THEME } from './ppt-theme';

export const SLIDE_MASTERS = {
  TITLE:         'Title Slide',
  TITLE_ONLY:    'Title Only',
  TITLE_CONTENT: 'Title and Content',
  SECTION:       'SubTitle Slide',
  BLANK:         'Blank Slide',
} as const;

export function defineSlideMasters(pptx: any, wide = false): void {
  const contentWidth = wide ? 12.333333 : 9;
  const slideWidth = wide ? 13.333333 : 10;
  const fonts = wide ? { heading: 'Arial', body: 'Arial' } : PPT_THEME.fonts;
  pptx.defineSlideMaster({
    title: SLIDE_MASTERS.TITLE,
    objects: [
      {
        placeholder: {
          options: {
            name: 'title', type: 'title',
            x: 0.5, y: 1.5, w: contentWidth, h: 1.5,
            align: 'center', bold: true,
            color: '000000', fontSize: 32,
            fontFace: fonts.heading,
          },
          text: 'Click to add title',
        },
      },
      {
        placeholder: {
          options: {
            name: 'body', type: 'body',
            x: 0.5, y: 3.07, w: contentWidth, h: 1,
            align: 'center',
            color: '000000', fontSize: 18,
            fontFace: fonts.body,
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
            x: 0.5, y: 0.2, w: contentWidth, h: 1,
            align: 'left', bold: true, valign: 'middle',
            color: '000000', fontSize: 24,
            fontFace: fonts.heading,
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
            x: 0.5, y: 0.2, w: contentWidth, h: 1,
            align: 'left', bold: true, valign: 'middle',
            color: '000000', fontSize: 24,
            fontFace: fonts.heading,
          },
          text: 'Click to add title',
        },
      },
      {
        placeholder: {
          options: {
            name: 'body', type: 'body',
            x: 0.5, y: 1.3, w: contentWidth, h: 4,
            align: 'left', valign: 'top',
            color: '000000', fontSize: 16,
            fontFace: fonts.body,
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
            x: 0, y: 2, w: slideWidth, h: 1,
            align: 'center', bold: true, valign: 'middle',
            color: '000000', fontSize: 24,
            fontFace: fonts.heading,
          },
          text: 'Click to add title',
        },
      },
    ],
  });

  pptx.defineSlideMaster({
    title: SLIDE_MASTERS.BLANK,
    objects: [],
    // Native table pagination reads its master margins; reserve space for repeated notes.
    margin: wide ? [.4, .5, .9, .5] : 0.0,
  });
}
