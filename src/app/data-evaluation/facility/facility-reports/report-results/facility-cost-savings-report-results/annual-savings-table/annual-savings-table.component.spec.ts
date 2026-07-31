import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualSavingsTableComponent } from './annual-savings-table.component';

describe('AnnualSavingsTableComponent', () => {
  let component: AnnualSavingsTableComponent;
  let fixture: ComponentFixture<AnnualSavingsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnualSavingsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnualSavingsTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
