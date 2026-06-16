import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlySavingsTableComponent } from './monthly-savings-table.component';

describe('MonthlySavingsTableComponent', () => {
  let component: MonthlySavingsTableComponent;
  let fixture: ComponentFixture<MonthlySavingsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonthlySavingsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlySavingsTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
