import { TestBed } from '@angular/core/testing';
import { InventoryChartDockComponent } from './inventory-chart-dock.component';

describe('Inventory chart pull handle', () => {
  it('keeps Charts defaults and exposes a distinct Compare dialog target', () => {
    const fixture = TestBed.configureTestingModule({ imports: [InventoryChartDockComponent] }).createComponent(InventoryChartDockComponent);
    fixture.detectChanges(); const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Charts'); expect(button.getAttribute('aria-controls')).toBe('inventory-chart-sheet');
    fixture.componentRef.setInput('label', 'Compare'); fixture.componentRef.setInput('panelId', 'analysis-comparison-sheet'); fixture.componentRef.setInput('open', true); fixture.detectChanges();
    expect(button.textContent).toContain('Compare'); expect(button.getAttribute('aria-controls')).toBe('analysis-comparison-sheet'); expect(button.getAttribute('aria-expanded')).toBe('true');
  });
  it('opens from keyboard activation or upward pull, and rejects disabled or cancelled pulls', () => {
    TestBed.configureTestingModule({ imports: [InventoryChartDockComponent] });
    const fixture = TestBed.createComponent(InventoryChartDockComponent), opened = vi.fn();
    fixture.componentInstance.opened.subscribe(opened); fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click(); expect(opened).toHaveBeenCalledTimes(1);
    const pointer = (type: string, y: number) => button.dispatchEvent(new MouseEvent(type, { button: 0, clientY: y, bubbles: true }));
    pointer('pointerdown', 100); pointer('pointerup', 50); expect(opened).toHaveBeenCalledTimes(2);
    pointer('pointerdown', 100); pointer('pointercancel', 100); pointer('pointerup', 50); expect(opened).toHaveBeenCalledTimes(2);
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges();
    button.click(); pointer('pointerdown', 100); pointer('pointerup', 50); expect(opened).toHaveBeenCalledTimes(2);
  });
});
