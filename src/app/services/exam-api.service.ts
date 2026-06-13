import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExamApiService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api/v1/exam';

  fetchExams(): Observable<any[]> {
    return this.http.get<any[]>(this.base);
  }

  fetchExamById(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  saveExam(examData: any): Observable<any> {
    return this.http.post<any>(`${this.base}/save`, examData);
  }

  deleteExam(id: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }

  generateExam(difficulty: string): Observable<any> {
    return this.http.post<any>(`${this.base}/generate?difficulty=${difficulty}`, {});
  }

  generateCustomExam(configs: any[]): Observable<any> {
    return this.http.post<any>(`${this.base}/generate-custom`, { configs });
  }

  submitExam(submissionData: any): Observable<any> {
    return this.http.post<any>(`${this.base}/submit`, submissionData);
  }

  fetchExamSubmission(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/submission/${id}`);
  }

  fetchStudentExamSubmissions(studentId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/student/${studentId}/submissions`);
  }
}
