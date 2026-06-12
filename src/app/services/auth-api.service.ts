import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { UserSession } from "../models/dsa-models";

export interface LoginRequest { username: string; pw: string; }
export interface RegisterRequest { username: string; pw: string; full_name: string; role: string; }
export interface RegisterResponse { message: string; }

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api/v1';

  login(body: LoginRequest): Observable<UserSession> { return this.http.post<UserSession>(`${this.base}/auth/login`, body); }
  register(body: RegisterRequest): Observable<RegisterResponse> { return this.http.post<RegisterResponse>(`${this.base}/auth/register`, body); }
}
