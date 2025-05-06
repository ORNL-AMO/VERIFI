import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import * as _ from 'lodash';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { SubRegionData, SubregionEmissions } from 'src/app/models/eGridEmissions';
import { IdbCustomEmissionsItem } from 'src/app/models/idbModels/customEmissions';

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

  async parseEGridData(assessmentReportVersion: '2024' | '2025') {
    let response = await fetch('assets/eGrid_data/eGrid_zipcode_lookup.xlsx')
    let buffer = await response.arrayBuffer();
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
    this.setCo2Emissions(sheetTwo, assessmentReportVersion);
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


  setCo2Emissions(csvResults: Array<any>, assessmentReportVersion: '2024' | '2025') {
    let subregionEmissions = new Array<SubregionEmissions>();
    csvResults.forEach(result => {
      let subregion: string = result['SUBRGN'];
      if (subregion) {
        let co2Emissions: number;
        if (assessmentReportVersion == '2024' || !assessmentReportVersion) {
          co2Emissions = Number(result['CO2e_AR4']);
        } else {
          co2Emissions = Number(result['CO2e_AR5']);
        }
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