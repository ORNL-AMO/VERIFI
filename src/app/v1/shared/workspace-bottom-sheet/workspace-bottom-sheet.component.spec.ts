import { TestBed } from '@angular/core/testing';
import { WorkspaceBottomSheetComponent } from './workspace-bottom-sheet.component';
function setup() {
  const fixture = TestBed.configureTestingModule({ imports: [WorkspaceBottomSheetComponent] }).createComponent(WorkspaceBottomSheetComponent);
  fixture.componentRef.setInput('panelId', 'test-sheet'); fixture.componentRef.setInput('title', 'Compare analyses'); fixture.detectChanges(); return fixture;
}
describe('Workspace bottom sheet', () => {
  afterEach(() => vi.useRealTimers());
  it('closes once after animation fallback and cancels timers when destroyed', () => {
    vi.useFakeTimers(); const fixture = setup(), closed = vi.fn(); fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.requestClose(); fixture.componentInstance.requestClose(); expect(closed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(360); expect(closed).toHaveBeenCalledOnce(); fixture.destroy();
  });
  it('accepts downward pulls but rejects canceled and upward pulls', () => {
    vi.useFakeTimers(); const fixture = setup(), closed = vi.fn(); fixture.componentInstance.closed.subscribe(closed);
    const handle = fixture.nativeElement.querySelector('.workspace-bottom-sheet__handle');
    const pointer = (type: string, y: number) => handle.dispatchEvent(new MouseEvent(type, { button: 0, clientY: y, bubbles: true }));
    pointer('pointerdown', 100); pointer('pointercancel', 100); pointer('pointerup', 200); expect(fixture.componentInstance.closing()).toBe(false);
    pointer('pointerdown', 100); pointer('pointerup', 50); handle.click(); expect(fixture.componentInstance.closing()).toBe(false);
    pointer('pointerdown', 100); pointer('pointerup', 150); vi.advanceTimersByTime(360); expect(closed).toHaveBeenCalledOnce();
  });
});
