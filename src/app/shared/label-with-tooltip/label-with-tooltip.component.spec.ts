import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelWithTooltipComponent } from './label-with-tooltip.component';

describe('LabelWithTooltipComponent', () => {
  let component: LabelWithTooltipComponent;
  let fixture: ComponentFixture<LabelWithTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LabelWithTooltipComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelWithTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
