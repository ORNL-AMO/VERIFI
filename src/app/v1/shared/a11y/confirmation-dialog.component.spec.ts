import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  it('owns dialog semantics, focus trapping, Escape, and focus restoration', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    TestBed.configureTestingModule({ imports: [ConfirmationDialogComponent] });
    const fixture = TestBed.createComponent(ConfirmationDialogComponent);
    fixture.componentRef.setInput('title', 'Delete item?');
    fixture.componentRef.setInput('titleId', 'delete-item-title');
    fixture.componentRef.setInput('cancelAriaLabel', 'Cancel delete item');
    fixture.componentRef.setInput('confirmLabel', 'Delete item');
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const buttons = dialog.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('delete-item-title');
    expect(document.activeElement).toBe(buttons[0]);

    buttons[buttons.length - 1].focus();
    buttons[buttons.length - 1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancelled).toHaveBeenCalledOnce();

    fixture.destroy();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('blocks Escape and backdrop cancellation while disabled', () => {
    TestBed.configureTestingModule({ imports: [ConfirmationDialogComponent] });
    const fixture = TestBed.createComponent(ConfirmationDialogComponent);
    fixture.componentRef.setInput('title', 'Delete item?');
    fixture.componentRef.setInput('titleId', 'delete-item-title');
    fixture.componentRef.setInput('cancelAriaLabel', 'Cancel delete item');
    fixture.componentRef.setInput('confirmLabel', 'Delete item');
    fixture.componentRef.setInput('disabled', true);
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLElement>('[role="dialog"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    element.querySelector<HTMLButtonElement>('.v1-modal-backdrop')?.click();

    expect(cancelled).not.toHaveBeenCalled();
    expect(Array.from(element.querySelectorAll<HTMLButtonElement>('button')).every(button => button.disabled)).toBe(true);
  });
});
