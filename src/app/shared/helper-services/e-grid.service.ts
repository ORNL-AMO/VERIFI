import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import * as _ from 'lodash';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { IdbCustomEmissionsItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { ConvertUnitsService } from '../convert-units/convert-units.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { EnergyUseCalculationsService } from './energy-use-calculations.service';
import { EmissionsResults, SubRegionData, SubregionEmissions } from 'src/app/models/eGridEmissions';

@Injectable({
  providedIn: 'root'
})
export class EGridService {

  subRegionsByZipcode: Array<SubRegionData>;

  excelCo2Emissions: Array<SubregionEmissions>;
  co2Emissions: Array<SubregionEmissions>;
  zipLatLong: Array<{ ZIP: string, LAT: string, LNG: string }>;
  constructor(private customEmissionsDbService: CustomEmissionsDbService, private convertUnitsService: ConvertUnitsService,
    private facilityDbService: FacilitydbService, private energyUseCalculationsService: EnergyUseCalculationsService) {
    this.customEmissionsDbService.accountEmissionsItems.subscribe(emissions => {
      this.combineExcelAndCustomEmissions();
    });
  }

  async parseEGridData() {
    await fetch('assets/eGrid_data/eGrid_zipcode_lookup.xlsx')
      .then(response => response.arrayBuffer())
      .then(buffer => {
        let wb: XLSX.WorkBook = XLSX.read(new Uint8Array(buffer), { type: "array", raw: false });
        //zip code regions
        // [0: "ZIP (character)"
        // 1: "ZIP (numeric)"
        // 2: "state"
        // 3: "eGRID Subregion #1"
        // 4: "eGRID Subregion #2"
        // 5: "eGRID Subregion #3"]
        let sheetOne = XLSX.utils.sheet_to_json(wb.Sheets["eGrid_zipcode_lookup"], { raw: false });
        this.setSubRegionsByZip(sheetOne)
        //eGrid data
        //0: SUBRGN
        //1: YEAR
        //2: CATEGORY
        //3: CO2e
        let sheetTwo = XLSX.utils.sheet_to_json(wb.Sheets["eGrid_co2"], { raw: false });
        this.setCo2Emissions(sheetTwo);
      });
  }

  setSubRegionsByZip(fileData: Array<any>) {
    let subRegionsByZipcode = new Array<SubRegionData>();
    fileData.forEach(result => {
      if (result['ZIP (character)']) {
        subRegionsByZipcode.push({
          zip: result['ZIP (character)'],
          state: result['state'],
          subregions: [
            result['eGRID Subregion #1'],
            result['eGRID Subregion #2'],
            result['eGRID Subregion #3'],
          ]
        })
      }
    });
    this.subRegionsByZipcode = subRegionsByZipcode;
  }


  setCo2Emissions(csvResults: Array<any>) {
    let subregionEmissions = new Array<SubregionEmissions>();
    csvResults.forEach(result => {
      let subregion: string = result['SUBRGN'];
      if (subregion) {
        let co2Emissions: number = Number(result['CO2e']);
        let year: number = Number(result['YEAR']);
        let category: 'LocationMix' | 'ResidualMix' = result['CATEGORY'];
        subregionEmissions = this.addEmissionRate(subregion, co2Emissions, year, category, subregionEmissions);
      }
    });

    this.excelCo2Emissions = subregionEmissions;
    this.combineExcelAndCustomEmissions();
  }

  combineExcelAndCustomEmissions() {
    if (this.excelCo2Emissions) {
      let customEmissions: Array<IdbCustomEmissionsItem> = this.customEmissionsDbService.accountEmissionsItems.getValue();
      this.co2Emissions = this.excelCo2Emissions.map(emissions => { return emissions });
      customEmissions.forEach(customEmission => {
        this.co2Emissions.push({
          subregion: customEmission.subregion,
          locationEmissionRates: customEmission.locationEmissionRates,
          residualEmissionRates: customEmission.residualEmissionRates,
          isCustom: true
        });
      });
    }
  }


  addEmissionRate(subregion: string, co2Emissions: number, year: number, category: 'LocationMix' | 'ResidualMix', subregionEmissions: Array<SubregionEmissions>): Array<SubregionEmissions> {
    let subregionIndex: number = subregionEmissions.findIndex(sEmissions => { return sEmissions.subregion == subregion });
    if (subregionIndex != -1) {
      if (category == 'LocationMix') {
        subregionEmissions[subregionIndex].locationEmissionRates.push({
          year: year,
          co2Emissions: co2Emissions
        })
      } else {
        subregionEmissions[subregionIndex].residualEmissionRates.push({
          year: year,
          co2Emissions: co2Emissions
        })
      }
    } else {
      if (category == 'LocationMix') {

        subregionEmissions.push({
          subregion: subregion,
          locationEmissionRates: [{
            year: year,
            co2Emissions: co2Emissions
          }],
          residualEmissionRates: new Array()
        })
      } else {
        subregionEmissions.push({
          subregion: subregion,
          locationEmissionRates: new Array(),
          residualEmissionRates: [{
            year: year,
            co2Emissions: co2Emissions
          }]
        })
      }
    }


    return subregionEmissions;
  }


  getEmissionsRate(subregion: string, year: number): { marketRate: number, locationRate: number } {
    if (this.co2Emissions) {
      let subregionEmissions: SubregionEmissions = this.co2Emissions.find(emissions => { return emissions.subregion == subregion });
      if (subregionEmissions) {
        let marketRate: number = 0;
        let locationRate: number = 0;
        if (subregionEmissions.locationEmissionRates.length != 0) {
          let closestYearRate: { co2Emissions: number, year: number } = _.minBy(subregionEmissions.locationEmissionRates, (emissionRate: { co2Emissions: number, year: number }) => {
            return Math.abs(emissionRate.year - year);
          });
          locationRate = closestYearRate.co2Emissions;
        }
        if (subregionEmissions.residualEmissionRates.length != 0) {
          let closestYearRate: { co2Emissions: number, year: number } = _.minBy(subregionEmissions.residualEmissionRates, (emissionRate: { co2Emissions: number, year: number }) => {
            return Math.abs(emissionRate.year - year);
          });
          marketRate = closestYearRate.co2Emissions;
        }
        return { marketRate: marketRate, locationRate: locationRate };
      }
    }
    return { marketRate: 0, locationRate: 0 };
  }


  async parseZipCodeLongLat() {
    await fetch('assets/eGrid_data/zip-long-lat.xlsx')
      .then(response => response.arrayBuffer())
      .then(buffer => {
        let wb: XLSX.WorkBook = XLSX.read(new Uint8Array(buffer), { type: "array", raw: false });
        //zip code regions
        // [0: "ZIP"
        // 1: "LAT"
        // 2: "LNG"
        let sheetOne = XLSX.utils.sheet_to_json(wb.Sheets["zip-long-lat"], { raw: false });
        this.zipLatLong = new Array();
        for (let i = 0; i < sheetOne.length; i++) {
          this.zipLatLong.push({
            ZIP: this.checkZIP(sheetOne[i]['ZIP']),
            LAT: sheetOne[i]['LAT'],
            LNG: sheetOne[i]['LNG'],
          })
        }
      });
  }


  checkZIP(zip: string): string {
    if (zip.length < 5) {
      for (let i = 0; i <= 5 - zip.length; i++) {
        zip = '0' + zip;
      }
    }
    return zip;
  }

  getEmissions(meter: IdbUtilityMeter, energyUse: number, energyUnit: string, year: number, energyIsSource: boolean): EmissionsResults {
    let isCompressedAir: boolean = (meter.source == 'Other Energy' && meter.fuel == 'Purchased Compressed Air');
    if (meter.source == 'Electricity' || meter.source == 'Natural Gas' || meter.source == 'Other Fuels' || isCompressedAir) {
      if (energyIsSource && meter.siteToSource != 0) {
        energyUse = energyUse / meter.siteToSource;
      } let convertedEnergyUse: number = energyUse;
      if (meter.source == 'Electricity' || isCompressedAir) {
        //electricty emissions rates in kWh
        convertedEnergyUse = this.convertUnitsService.value(energyUse).from(energyUnit).to('kWh');
      } else {
        //non-electricity emissions rates are in MMBtu
        convertedEnergyUse = this.convertUnitsService.value(energyUse).from(energyUnit).to('MMBtu');
      }
      let locationEmissions: number;
      let marketEmissions: number;

      let marketEmissionsOutputRate: number;
      if (meter.source == 'Electricity' || isCompressedAir) {
        let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        let meterFacility: IdbFacility = accountFacilities.find(facility => { return facility.guid == meter.facilityId });
        let emissionsRates: { marketRate: number, locationRate: number } = this.getEmissionsRate(meterFacility.eGridSubregion, year);
        marketEmissionsOutputRate = emissionsRates.marketRate;

        if (meter.includeInEnergy) {
          locationEmissions = convertedEnergyUse * emissionsRates.locationRate * meter.locationGHGMultiplier;
          marketEmissions = convertedEnergyUse * emissionsRates.marketRate * meter.marketGHGMultiplier;
        } else {
          marketEmissions = 0;
          locationEmissions = 0;
        }
      } else {
        marketEmissionsOutputRate = this.energyUseCalculationsService.getFuelEmissionsOutputRate(meter.source, meter.fuel, meter.phase, energyUnit);
        locationEmissions = convertedEnergyUse * marketEmissionsOutputRate;
        marketEmissions = convertedEnergyUse * marketEmissionsOutputRate;
      }
      let RECs: number = convertedEnergyUse * meter.recsMultiplier;
      let excessRECs: number;
      let emissionsEnergyUse: number = convertedEnergyUse;
      if (meter.includeInEnergy == false) {
        emissionsEnergyUse = 0;
      }

      if (RECs - emissionsEnergyUse <= 0) {
        excessRECs = 0;
      } else {
        excessRECs = RECs;
      }
      let excessRECsEmissions: number = excessRECs * marketEmissionsOutputRate;
      excessRECs = this.convertUnitsService.value(excessRECs).from('kWh').to('MWh');
      RECs = this.convertUnitsService.value(RECs).from('kWh').to('MWh');
      return { RECs: RECs, locationEmissions: locationEmissions, marketEmissions: marketEmissions, excessRECs: excessRECs, excessRECsEmissions: excessRECsEmissions };
    } else {
      return { RECs: 0, locationEmissions: 0, marketEmissions: 0, excessRECs: 0, excessRECsEmissions: 0 };
    }
  }
}