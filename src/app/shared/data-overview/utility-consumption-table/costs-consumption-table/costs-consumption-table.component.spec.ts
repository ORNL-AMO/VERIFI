import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostsConsumptionTableComponent } from './costs-consumption-table.component';

describe('CostsConsumptionTableComponent', () => {
  let component: CostsConsumptionTableComponent;
  let fixture: ComponentFixture<CostsConsumptionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostsConsumptionTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostsConsumptionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
