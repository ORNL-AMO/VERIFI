import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterGroupTableComponent } from './meter-group-table.component';

describe('MeterGroupTableComponent', () => {
  let component: MeterGroupTableComponent;
  let fixture: ComponentFixture<MeterGroupTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MeterGroupTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MeterGroupTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
