import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankedGroupResultsTableComponent } from './banked-group-results-table.component';

describe('BankedGroupResultsTableComponent', () => {
  let component: BankedGroupResultsTableComponent;
  let fixture: ComponentFixture<BankedGroupResultsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BankedGroupResultsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankedGroupResultsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
