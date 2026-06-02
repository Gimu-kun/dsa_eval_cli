import { Injectable, signal, inject, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  Question,
  EvaluationResult,
  SubmissionLog,
  UserSession
} from '../models/dsa-models';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);

  private readonly apiUrl = 'http://localhost:8080/api/v1';

  // Expose currentUser signal from TokenService
  public readonly currentUser = this.tokenService.currentUser;

  // Topics catalog
  public readonly topics = [
    { id: 'TOPIC_BST', name: 'Cây nhị phân tìm kiếm (BST)' },
    { id: 'TOPIC_LINKEDLIST', name: 'Danh sách liên kết (Linked List)' },
    { id: 'TOPIC_SORTING', name: 'Thuật toán sắp xếp (Sorting)' },
    { id: 'TOPIC_STACK_QUEUE', name: 'Ngăn xếp & Hàng đợi (Stack/Queue)' }
  ];

  // Questions Database
  private readonly questionsList = signal<Question[]>([]);

  // Submission History Signal
  public readonly submissionHistory = signal<SubmissionLog[]>([]);

  // Learning Progress Signals from Backend
  public readonly overallExamSlope = signal<number>(0);
  public readonly overallExamTrend = signal<string>('STABLE');
  public readonly currentMasteryLevels = signal<{ [key: string]: number }>({});
  public readonly chapterMasteryLevels = signal<{ [key: string]: number }>({});
  public readonly topicTrends = signal<{ [key: string]: string }>({});
  public readonly recommendations = signal<string[]>([]);

  constructor() {
    this.initializeData();

    // Reactively refresh progress whenever the currentUser changes (login/logout)
    effect(() => {
      this.refreshProgress();
    });
  }

  // Auth Operations
  public login(credentials: any): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((res) => {
        this.tokenService.setSession(res);
      })
    );
  }

  public register(info: any): Observable<UserSession> {
    console.log(info)
    return this.http.post<UserSession>(`${this.apiUrl}/auth/register`, info).pipe(
      tap((res) => {
        this.tokenService.setSession(res);
      })
    );
  }

  public logout(): void {
    this.tokenService.clearSession();
    if (this.isBrowser) {
      localStorage.removeItem('dsa_submissions_history');
    }
  }

  public fetchTopics(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/topic`);
  }

  public refreshQuestions(): void {
    this.http.get<Question[]>(`${this.apiUrl}/question`).subscribe({
      next: (res) => {
        this.questionsList.set(res);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách câu hỏi từ backend:', err);
      }
    });
  }

  public addQuestion(questionData: any): Observable<Question> {
    return this.http.post<Question>(`${this.apiUrl}/question`, questionData).pipe(
      tap(() => {
        this.refreshQuestions();
      })
    );
  }

  public deleteQuestion(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/question/${id}`).pipe(
      tap(() => {
        this.refreshQuestions();
      })
    );
  }

  public refreshProgress(): void {
    const user = this.currentUser();
    if (!user) {
      // Clear all progress metrics when logged out
      this.submissionHistory.set([]);
      this.overallExamSlope.set(0);
      this.overallExamTrend.set('STABLE');
      this.currentMasteryLevels.set({});
      this.chapterMasteryLevels.set({});
      this.topicTrends.set({});
      this.recommendations.set([]);
      return;
    }

    // Refresh questions so they are fetched with the authenticated token
    this.refreshQuestions();

    this.http.get<any>(`${this.apiUrl}/student/${user.id}/progress`).subscribe({
      next: (res) => {
        // Map snake_case or camelCase history items to correct camelCase interface properties
        if (res.history) {
          const mappedHistory: SubmissionLog[] = res.history.map((item: any) => {
            const rawScore = item.score !== undefined ? item.score : (item.score_earned !== undefined ? item.score_earned : 0);
            const score = Math.round(rawScore * 100) / 100;
            const evalRes = item.evaluation_result || item.evaluationResult;
            let formattedEvalRes = undefined;
            if (evalRes) {
              formattedEvalRes = {
                ...evalRes,
                score_earned: Math.round((evalRes.score_earned !== undefined ? evalRes.score_earned : rawScore) * 100) / 100,
                acc_score: evalRes.acc_score !== undefined ? Math.round(evalRes.acc_score * 100) / 100 : 0,
                comp_score: evalRes.comp_score !== undefined ? Math.round(evalRes.comp_score * 100) / 100 : 0,
                log_score: evalRes.log_score !== undefined ? Math.round(evalRes.log_score * 100) / 100 : 0,
              };
            }
            return {
              id: item.id || item.answer_id,
              questionId: item.question_id || item.questionId,
              questionTitle: item.question_title || item.questionTitle,
              topicId: item.topic_id || item.topicId,
              submittedText: item.submitted_text || item.submittedText,
              score: score,
              bloomLevel: item.bloom_level || item.bloomLevel,
              difficulty: item.difficulty,
              type: item.type,
              evaluatedAt: item.evaluated_at || item.evaluatedAt,
              evaluationResult: formattedEvalRes
            };
          });
          this.submissionHistory.set(mappedHistory);
          if (this.isBrowser) {
            localStorage.setItem('dsa_submissions_history', JSON.stringify(mappedHistory));
          }
        } else {
          this.submissionHistory.set([]);
        }

        // Map overall slope, trend, and mastery levels supporting both casing formats
        const slope = res.overall_exam_slope !== undefined ? res.overall_exam_slope : (res.overallExamSlope !== undefined ? res.overallExamSlope : 0);
        this.overallExamSlope.set(slope);
        this.overallExamTrend.set(res.overall_exam_trend || res.overallExamTrend || 'STABLE');
        this.currentMasteryLevels.set(res.current_mastery_levels || res.currentMasteryLevels || {});
        this.chapterMasteryLevels.set(res.chapter_mastery_levels || res.chapterMasteryLevels || {});
        this.topicTrends.set(res.topic_trends || res.topicTrends || {});
        this.recommendations.set(res.recommendations || []);
      },
      error: (err) => {
        console.error('Lỗi khi tải lại tiến trình học tập:', err);
      }
    });
  }

  private initializeData(): void {
    // No initial questions fetch before login to avoid 401/400 errors
  }

  // Get all questions
  public getQuestions(): Question[] {
    return this.questionsList();
  }

  // Get question by ID
  public getQuestionById(id: string): Question | undefined {
    return this.questionsList().find(q => q.id === id);
  }

  // Get submission log by ID
  public getSubmissionLogById(id: string): SubmissionLog | undefined {
    return this.submissionHistory().find(log => log.id === id);
  }

  // Reset History
  public resetHistory(): void {
    if (this.isBrowser) {
      localStorage.removeItem('dsa_submissions_history');
    }
    this.submissionHistory.set([]);
  }

  // Send answer to Spring Boot Backend for evaluation
  public evaluateAnswer(questionId: string, submittedText: string): Observable<EvaluationResult> {
    const user = this.currentUser();
    const userId = user ? user.id : 'STU_001';

    return this.http.post<EvaluationResult>(`${this.apiUrl}/eval`, {
      user_id: userId,
      question_id: questionId,
      submitted_text: submittedText
    }).pipe(
      tap((result) => {
        const q = this.getQuestionById(questionId);
        const roundedResult = {
          ...result,
          score_earned: Math.round(result.score_earned * 100) / 100,
          acc_score: Math.round(result.acc_score * 100) / 100,
          comp_score: Math.round(result.comp_score * 100) / 100,
          log_score: Math.round(result.log_score * 100) / 100,
        };
        const newLog: SubmissionLog = {
          id: roundedResult.answer_id as string,
          questionId: questionId,
          questionTitle: q ? q.content : 'Câu hỏi',
          topicId: q ? q.topic_id : 'TOPIC_BST',
          submittedText: submittedText,
          score: roundedResult.score_earned,
          bloomLevel: q ? q.bloom_level : 'REMEMBERING',
          difficulty: q ? q.difficulty : 'EASY',
          type: q ? q.type : 'DESCRIPTIVE',
          evaluatedAt: roundedResult.evaluated_at,
          evaluationResult: roundedResult
        };

        // Prepend to history signal
        this.submissionHistory.update((h) => [newLog, ...h]);
        if (this.isBrowser) {
          localStorage.setItem(
            'dsa_submissions_history',
            JSON.stringify(this.submissionHistory())
          );
        }
        // Refresh full progress report from backend
        this.refreshProgress();
      })
    );
  }

  // Admin methods for Concepts
  public fetchConcepts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/concept`);
  }

  public createConcept(conceptData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/concept`, conceptData);
  }

  public updateConcept(id: string, conceptData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/concept/${id}`, conceptData);
  }

  public deleteConcept(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/concept/${id}`);
  }

  // Admin methods for Semantic Relations
  public fetchRelations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sr`);
  }

  public createRelation(srData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sr`, srData);
  }

  public deleteRelation(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/sr/${id}`);
  }

  // Admin methods for Logical Rules
  public fetchRules(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lr`);
  }

  public createRule(lrData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/lr`, lrData);
  }

  public deleteRule(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/lr/${id}`);
  }

  // Admin methods for Logical Functions
  public fetchFunctions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lf`);
  }

  public createFunction(lfData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/lf`, lfData);
  }

  public deleteFunction(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/lf/${id}`);
  }

  // Admin method to fetch all students
  public fetchStudents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/student`);
  }

  // Admin method to fetch a student's progress
  public fetchStudentProgress(studentId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/student/${studentId}/progress`);
  }

  // Admin method to generate exam paper (matrix)
  public generateExam(difficulty: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/exam/generate?difficulty=${difficulty}`, {});
  }

  // Admin method to generate custom matrix exam paper
  public generateCustomExam(configs: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/exam/generate-custom`, { configs: configs });
  }
}
