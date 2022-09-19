import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSetupBannerComponent } from './data-setup-banner.component';

describe('DataSetupBannerComponent', () => {
  let component: DataSetupBannerComponent;
  let fixture: ComponentFixture<DataSetupBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataSetupBannerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataSetupBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
