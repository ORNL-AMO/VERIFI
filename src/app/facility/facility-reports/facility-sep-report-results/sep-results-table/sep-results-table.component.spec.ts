import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SepResultsTableComponent } from './sep-results-table.component';

describe('SepResultsTableComponent', () => {
  let component: SepResultsTableComponent;
  let fixture: ComponentFixture<SepResultsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SepResultsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SepResultsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
