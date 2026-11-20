import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { setupDeletion } from './analysis-setup-delete.testing';

afterEach(() => TestBed.resetTestingModule());

describe('Setup delete dialog keyboard and responsive behavior', () => {
  it.each(['account', 'facility'] as const)('traps keyboard focus and returns it to the %s delete button', async scope => {
    const view = setupDeletion(scope);
    view.opener().focus();
    await userEvent.keyboard('{Enter}'); await view.settle();
    const dialog = view.root.querySelector<HTMLElement>('[role=dialog]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    view.confirm().focus(); await userEvent.keyboard('{Tab}');
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}'); await view.settle();
    expect(view.root.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(view.opener());
  });

  it.each(['light', 'dark'])('keeps actions and confirmation within a narrow %s viewport', async theme => {
    await page.viewport(390, 800);

    try {
      const view = setupDeletion();
      view.root.classList.add(`v1-theme-${theme}`);
      const button = view.opener().getBoundingClientRect();
      expect(button.left).toBeGreaterThanOrEqual(0);
      expect(button.right).toBeLessThanOrEqual(390);
      view.opener().click(); await view.settle();
      const dialog = view.root.querySelector<HTMLElement>('[role=dialog]')!.getBoundingClientRect();
      expect(dialog.left).toBeGreaterThanOrEqual(0);
      expect(dialog.right).toBeLessThanOrEqual(390);
      expect(view.confirm().getBoundingClientRect().bottom).toBeLessThanOrEqual(800);
    } finally {
      await page.viewport(1200, 900);
    }
  });
});
