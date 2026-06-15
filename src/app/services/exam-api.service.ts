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

  fetchTemplates(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/api/v1/exam-templates');
  }

  fetchTemplateById(id: string): Observable<any> {
    return this.http.get<any>(`http://localhost:8080/api/v1/exam-templates/${id}`);
  }

  saveTemplate(templateData: any): Observable<any> {
    return this.http.post<any>('http://localhost:8080/api/v1/exam-templates', templateData);
  }

  deleteTemplate(id: string): Observable<any> {
    return this.http.delete<any>(`http://localhost:8080/api/v1/exam-templates/${id}`);
  }

  generateExamFromTemplate(templateId: string, title: string, duration: number, questionCount: number): Observable<any> {
    return this.http.post<any>(`http://localhost:8080/api/v1/exam-templates/${templateId}/generate?title=${encodeURIComponent(title)}&duration=${duration}&questionCount=${questionCount}`, {});
  }

  validatePseudoCode(code: string): Observable<any> {
    return this.http.post<any>(`${this.base}/validate-ast`, { code });
  }

  fetchActiveSession(userId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/session/active`, { params: { userId } });
  }

  startExamSession(userId: string, examId: string): Observable<any> {
    return this.http.post<any>(`${this.base}/session/start`, { userId, examId });
  }

  updateSessionAnswers(sessionId: string, answers: any): Observable<any> {
    return this.http.post<any>(`${this.base}/session/update-answers`, { sessionId, answers });
  }

  fetchRemainingTime(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/session/${sessionId}/remaining-time`);
  }

  forfeitExamSession(sessionId: string): Observable<any> {
    return this.http.post<any>(`${this.base}/session/${sessionId}/forfeit`, {});
  }

  submitExamSession(sessionId: string, answers: any): Observable<any> {
    return this.http.post<any>(`${this.base}/session/${sessionId}/submit`, { answers });
  }
}
