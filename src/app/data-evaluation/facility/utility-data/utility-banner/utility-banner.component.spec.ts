import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityBannerComponent } from './utility-banner.component';

describe('UtilityBannerComponent', () => {
  let component: UtilityBannerComponent;
  let fixture: ComponentFixture<UtilityBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UtilityBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
