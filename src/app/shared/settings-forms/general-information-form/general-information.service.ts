import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, Observable, throwError } from 'rxjs';
import { NominatimLocation } from 'src/app/weather-data/weather-data.service';

@Injectable({
  providedIn: 'root'
})

export class GeneralInformationService {
  constructor(private http: HttpClient) { }

  // getStateAndCityByZip(zip: string, countryCode: string = 'us'): Observable<ZipResponse>{
  //   const url = 'https://api.zippopotam.us/'+ countryCode + '/'+zip;
  //   return this.http.get<any>(url).pipe(map(data => {
  //     const place = data.places[0];
  //     return {
  //       city: place['place name'],
  //       state: place['state']
  //     } as ZipResponse;
  //   }),
  // catchError(error => {
  //   return throwError(() => new Error('Something went wrong!'));
  // }));
  // }

  async getStateAndCityByZip(zip: string, countryCode: string = 'us'): Promise<ZipResponse> {
    try {
      const url = 'https://api.zippopotam.us/' + countryCode + '/' + zip;
      const data: any = await firstValueFrom(this.http.get(url));
      return {
        city: data.places[0]['place name'],
        state: data.places[0]['state']
      };

    }
    catch (error) {
      return null;
    }
  }

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
}

export interface ZipResponse {
  city: string;
  state: string;
}

export interface NominatimResponse {
  place_id: number;
  display_name: string;
  address: {
    postcode: string;
    city: string;
    state: string;
    country: string;
  }
}

