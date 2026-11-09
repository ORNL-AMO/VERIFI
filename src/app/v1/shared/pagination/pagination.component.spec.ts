import { TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  function setup(total = 132, page = 1, pageSize = 12) {
    const fixture = TestBed.configureTestingModule({ imports: [PaginationComponent] }).createComponent(PaginationComponent);
    fixture.componentRef.setInput('collectionSize', total);
    fixture.componentRef.setInput('pageSize', pageSize);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('ariaLabel', 'Meter readings pages');
    const changed = vi.fn(); fixture.componentInstance.pageChange.subscribe(changed);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = (label: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    return { fixture, root, component: fixture.componentInstance, changed, button };
  }

  it.each([0, 1, 12])('hides navigation for %s rows without emitting', total => {
    const { root, changed } = setup(total);
    expect(root.querySelector('nav')).toBeNull(); expect(changed).not.toHaveBeenCalled();
  });

  it.each([
    [1, [1, 2, 3, 4, 5]], [5, [1, 2, 3, 4, 5]],
    [6, [6, 7, 8, 9, 10]], [10, [6, 7, 8, 9, 10]], [11, [11]]
  ] as const)('shows the five-page batch for page %s', (page, expected) => {
    const { root, button } = setup(132, page);
    expect([...root.querySelectorAll('ol button')].map(item => Number(item.textContent))).toEqual(expected);
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Meter readings pages');
    expect(button(`Page ${page}`).getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('[role="status"]')?.textContent).toBe(`Page ${page} of 11`);
    expect(root.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('emits one-based page requests from native controls without changing its input', () => {
    const { fixture, component, button, changed } = setup(132, 5);
    button('Next page').click(); expect(changed).toHaveBeenLastCalledWith(6); expect(component.page()).toBe(5);
    fixture.componentRef.setInput('page', 6); fixture.detectChanges();
    button('Previous page').click(); expect(changed).toHaveBeenLastCalledWith(5);
    button('Page 8').click(); expect(changed).toHaveBeenLastCalledWith(8);
    expect(changed.mock.calls).toEqual([[6], [5], [8]]);
  });

  it('disables the first/last boundaries and rejects invalid or unchanged requests', () => {
    const { fixture, component, button, changed } = setup();
    expect(button('Previous page').disabled).toBe(true);
    for (const page of [0, -1, 1, 12, 1.5, NaN]) component.selectPage(page);
    expect(changed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('page', 11); fixture.detectChanges();
    expect(button('Next page').disabled).toBe(true); button('Next page').click();
    expect(changed).not.toHaveBeenCalled();
  });

  it('blocks all controls while disabled', () => {
    const { fixture, root, component, changed } = setup(132, 3);
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges();
    for (const button of root.querySelectorAll<HTMLButtonElement>('button')) { expect(button.disabled).toBe(true); button.click(); }
    component.selectPage(4); expect(changed).not.toHaveBeenCalled();
  });

  it('updates and clamps presentation silently when collection, page or page size changes', () => {
    const { fixture, component, changed, root } = setup(132, 11);
    fixture.componentRef.setInput('collectionSize', 30); fixture.detectChanges();
    expect(component.currentPage()).toBe(3); expect(root.textContent).toContain('Page 3 of 3');
    fixture.componentRef.setInput('page', -2); fixture.detectChanges(); expect(component.currentPage()).toBe(1);
    fixture.componentRef.setInput('pageSize', 36); fixture.detectChanges(); expect(root.querySelector('nav')).toBeNull();
    expect(changed).not.toHaveBeenCalled();
  });

  it('bounds rendering for very large collections and the existing All rows sentinel', () => {
    const { fixture, root, component, changed } = setup(999999999999, 80000000000);
    expect(root.querySelectorAll('ol button')).toHaveLength(5);
    expect(component.pageCount()).toBe(83333333334);
    fixture.componentRef.setInput('pageSize', 999999999999); fixture.detectChanges();
    expect(root.querySelector('nav')).toBeNull(); expect(changed).not.toHaveBeenCalled();
  });
});
