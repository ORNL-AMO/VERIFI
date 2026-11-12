import { expect } from 'vitest';

/** Shared native-layout checks for the report Setup section contract. */
export function expectReportSetupSections(setup: HTMLElement, count: number): readonly HTMLElement[] {
  const sections = [...setup.querySelectorAll<HTMLElement>('.report-setup-section')];
  expect(sections).toHaveLength(count);
  expect(getComputedStyle(setup).borderRadius).toBe('0px');
  const styles = sections.map(section => getComputedStyle(section.querySelector('.setup-section-heading')!));
  expect(new Set(styles.map(style => style.backgroundColor)).size).toBe(1);
  expect(new Set(styles.map(style => style.fontSize)).size).toBe(1);

  for (const [index, section] of sections.entries()) {
    const heading = section.querySelector<HTMLElement>(':scope > .setup-section-heading')!;
    const style = styles[index];
    expect(section.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.nextElementSibling!.classList.contains('report-setup-body')).toBe(true);
    expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(style.backgroundColor).not.toBe(getComputedStyle(setup).backgroundColor);
    expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(700);
    expect(parseFloat(style.borderBottomWidth)).toBeGreaterThanOrEqual(1);
    expect(Math.abs(heading.getBoundingClientRect().width - section.clientWidth)).toBeLessThanOrEqual(1);
    expect(getComputedStyle(section).borderRadius).toBe('0px');
    if (index) {
      const gap = section.getBoundingClientRect().top - sections[index - 1].getBoundingClientRect().bottom;
      expect(Math.abs(gap)).toBeLessThanOrEqual(1);
    }
  }
  return sections;
}
