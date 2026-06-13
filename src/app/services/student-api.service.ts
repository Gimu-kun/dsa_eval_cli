import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EvaluationResult } from '../models/dsa-models';

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api/v1';

  fetchStudents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/student`);
  }

  fetchStudentProgress(studentId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/student/${studentId}/progress`);
  }

  fetchOverallStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/student/overall-stats`);
  }

  evaluateAnswer(questionId: string, submittedText: string, userId: string = 'STU_001'): Observable<EvaluationResult> {
    return this.http.post<EvaluationResult>(`${this.base}/eval`, {
      user_id: userId,
      question_id: questionId,
      submitted_text: submittedText
    });
  }
}
