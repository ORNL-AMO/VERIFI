import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankedGroupsDetailsComponent } from './banked-groups-details.component';

describe('BankedGroupsDetailsComponent', () => {
  let component: BankedGroupsDetailsComponent;
  let fixture: ComponentFixture<BankedGroupsDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BankedGroupsDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankedGroupsDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
