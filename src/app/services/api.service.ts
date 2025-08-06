import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiRequest, ApiResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  makeRequest(request: ApiRequest): Observable<ApiResponse> {
    const headers = this.buildHeaders(request.headers);
    const options = {
      headers,
      observe: 'response' as const
    };

    let httpCall: Observable<HttpResponse<any>>;

    switch (request.method) {
      case 'GET':
        httpCall = this.http.get(request.url, options);
        break;
      case 'POST':
        httpCall = this.http.post(request.url, request.body, options);
        break;
      case 'PUT':
        httpCall = this.http.put(request.url, request.body, options);
        break;
      case 'DELETE':
        httpCall = this.http.delete(request.url, options);
        break;
      default:
        return of({
          status: 400,
          statusText: 'Bad Request',
          body: 'Unsupported HTTP method',
          headers: {}
        });
    }

    return httpCall.pipe(
      map((response: HttpResponse<any>) => {
        return {
          status: response.status,
          statusText: response.statusText,
          body: response.body,
          headers: this.extractHeaders(response.headers)
        } as ApiResponse;
      }),
      catchError((error) => {
        return of({
          status: error.status || 0,
          statusText: error.statusText || 'Unknown Error',
          body: error.error || error.message,
          headers: error.headers ? this.extractHeaders(error.headers) : {}
        } as ApiResponse);
      })
    );
  }

  private buildHeaders(customHeaders?: { [key: string]: string }): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Add JWT token if available
    const accessToken = this.authService.accessToken();
    if (accessToken) {
      headers = headers.set('Authorization', `Bearer ${accessToken}`);
    }

    // Add custom headers
    if (customHeaders) {
      Object.keys(customHeaders).forEach(key => {
        headers = headers.set(key, customHeaders[key]);
      });
    }

    return headers;
  }

  private extractHeaders(httpHeaders: any): { [key: string]: string } {
    const headers: { [key: string]: string } = {};
    
    if (httpHeaders && httpHeaders.keys) {
      httpHeaders.keys().forEach((key: string) => {
        headers[key] = httpHeaders.get(key);
      });
    }
    
    return headers;
  }
}
