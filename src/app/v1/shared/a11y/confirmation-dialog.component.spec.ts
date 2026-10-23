import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  it('owns dialog semantics and Escape cancellation', async () => {
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
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('delete-item-title');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancelled).toHaveBeenCalledOnce();

    fixture.destroy();
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
