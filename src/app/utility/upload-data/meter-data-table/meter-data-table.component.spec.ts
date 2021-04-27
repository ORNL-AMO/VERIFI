import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterDataTableComponent } from './meter-data-table.component';

describe('MeterDataTableComponent', () => {
  let component: MeterDataTableComponent;
  let fixture: ComponentFixture<MeterDataTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MeterDataTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeterDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
