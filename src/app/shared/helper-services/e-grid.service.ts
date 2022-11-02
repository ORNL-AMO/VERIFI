import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import * as _ from 'lodash';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { IdbCustomEmissionsItem } from 'src/app/models/idb';

@Injectable({
  providedIn: 'root'
})
export class EGridService {

  subRegionsByZipcode: Array<SubRegionData>;

  excelCo2Emissions: Array<SubregionEmissions>;
  co2Emissions: Array<SubregionEmissions>;
  zipLatLong: Array<{ ZIP: string, LAT: string, LNG: string }>;
  constructor(private customEmissionsDbService: CustomEmissionsDbService) {
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
}

export interface SubRegionData {
  zip: number,
  state: string,
  co2Emissions?: number,
  subregions?: Array<string>
}

export interface SubregionEmissions {
  subregion: string,
  locationEmissionRates: Array<{ co2Emissions: number, year: number }>,
  residualEmissionRates: Array<{ co2Emissions: number, year: number }>,
  isCustom?: boolean
}