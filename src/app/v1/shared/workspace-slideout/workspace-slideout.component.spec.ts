import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspaceSlideoutComponent } from './workspace-slideout.component';

describe('WorkspaceSlideoutComponent', () => {
  it('renders a large slideout and emits close requests', () => {
    const fixture = setup();
    const closed: void[] = [];
    fixture.componentInstance.size = 'large';
    fixture.componentInstance.closed.subscribe(() => closed.push(undefined));

    fixture.detectChanges();
    backdropButton(fixture).click();

    expect(fixture.nativeElement.querySelector('.v1-workspace-slideout--large')).toBeTruthy();
    expect(closed.length).toBe(1);
  });

  it('keeps close controls disabled while saving', () => {
    const fixture = setup();
    const closed: void[] = [];
    fixture.componentInstance.saving = true;
    fixture.componentInstance.closed.subscribe(() => closed.push(undefined));

    fixture.detectChanges();
    backdropButton(fixture).click();
    closeButton(fixture).click();

    expect(backdropButton(fixture).disabled).toBe(true);
    expect(closeButton(fixture).disabled).toBe(true);
    expect(closed).toEqual([]);
  });
});

function setup(): ComponentFixture<WorkspaceSlideoutComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [WorkspaceSlideoutComponent]
  }).createComponent(WorkspaceSlideoutComponent);
  fixture.componentInstance.title = 'Edit data';
  return fixture;
}

function backdropButton(fixture: ComponentFixture<WorkspaceSlideoutComponent>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.v1-workspace-slideout-backdrop') as HTMLButtonElement;
}

function closeButton(fixture: ComponentFixture<WorkspaceSlideoutComponent>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.v1-workspace-slideout__header .v1-icon-btn') as HTMLButtonElement;
}
