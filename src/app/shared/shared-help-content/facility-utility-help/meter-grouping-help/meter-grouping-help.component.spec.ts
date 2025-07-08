import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterGroupingHelpComponent } from './meter-grouping-help.component';

describe('MeterGroupingHelpComponent', () => {
  let component: MeterGroupingHelpComponent;
  let fixture: ComponentFixture<MeterGroupingHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MeterGroupingHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MeterGroupingHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
