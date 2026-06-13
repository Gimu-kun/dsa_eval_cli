import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Question } from '../models/dsa-models';

@Injectable({ providedIn: 'root' })
export class QuestionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api/v1/question';

  getQuestions(): Observable<Question[]> {
    return this.http.get<Question[]>(this.base);
  }

  getQuestion(id: string): Observable<Question> {
    return this.http.get<Question>(`${this.base}/${id}`);
  }

  createQuestion(body: any): Observable<Question> {
    return this.http.post<Question>(this.base, body);
  }

  updateQuestion(id: string, body: any): Observable<Question> {
    return this.http.put<Question>(`${this.base}/${id}`, body);
  }

  deleteQuestion(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
