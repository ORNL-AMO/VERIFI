import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterGroupingComponent } from './meter-grouping.component';

describe('MeterGroupingComponent', () => {
  let component: MeterGroupingComponent;
  let fixture: ComponentFixture<MeterGroupingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MeterGroupingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeterGroupingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
