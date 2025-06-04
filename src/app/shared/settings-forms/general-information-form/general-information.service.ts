import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class GeneralInformationService {
  constructor(private http: HttpClient) { }

  async getStateAndCity(zip: string): Promise<Array<NominatimResponse>> {
    if (zip) {
      let url = `https://nominatim.openstreetmap.org/search?q=${zip}+USA&format=json&addressdetails=1`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.length > 0) {
          return data;
        }
      } catch (err) {
        return [];
      }
    }
    return null;
  }

  async getCompleteAddress(address: string): Promise<Array<NominatimResponse>> {
    if(address){
      let url = `https://nominatim.openstreetmap.org/search?q=${address},us&format=json&addressdetails=1`;
      console.log(url);
      try{
        const response = await fetch(url);
        const data = await response.json();
        if(data.length > 0){
          return data;
        }
      } catch (err) {
        return [];
      }
    }
    return null;
  }
}

export interface NominatimResponse {
  place_id: string;
  display_name: string;
  address: {
    postcode: string;
    city: string;
    state: string;
    country: string;
    house_number: string;
    road: string;
  }
}
