import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostsOverviewComponent } from './costs-overview.component';

describe('CostsOverviewComponent', () => {
  let component: CostsOverviewComponent;
  let fixture: ComponentFixture<CostsOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostsOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostsOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
