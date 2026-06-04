import { Component, inject, signal, computed, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../services/mock-data.service';
import { Question, SubmissionLog, BloomLevel, QuestionDifficulty, QuestionType } from '../../models/dsa-models';
import { Chart, registerables } from 'chart.js/auto';

// Register Chart.js elements
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly mockService = inject(MockDataService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly activeExams = signal<any[]>([]);
  protected readonly studentSubmissions = signal<any[]>([]);

  // Expose signals from MockDataService
  protected readonly currentUser = this.mockService.currentUser;
  protected readonly overallExamSlope = this.mockService.overallExamSlope;
  protected readonly overallExamTrend = this.mockService.overallExamTrend;
  protected readonly currentMasteryLevels = this.mockService.currentMasteryLevels;
  protected readonly chapterMasteryLevels = this.mockService.chapterMasteryLevels;
  protected readonly recommendations = this.mockService.recommendations;

  // Lecturer/Admin signals
  protected readonly activeTab = signal<string>('progress');
  protected readonly studentsList = signal<any[]>([]);
  protected readonly selectedStudentId = signal<string>('');

  // Filters
  protected readonly selectedTopic = signal<string>('ALL');
  protected readonly selectedDifficulty = signal<string>('ALL');
  protected readonly selectedBloom = signal<string>('ALL');

  // References to Chart Canvas elements
  @ViewChild('slot1Canvas') private slot1Canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('slot2Canvas') private slot2Canvas!: ElementRef<HTMLCanvasElement>;

  private slot1ChartInstance: Chart | null = null;
  private slot2ChartInstance: Chart | null = null;

  // Chart Slot selections
  protected readonly slot1ChartType = signal<string>('growth_attempts');
  protected readonly slot2ChartType = signal<string>('mastery_topics');

  // Experimental data (80 entries matching Du_lieu_cham_diem_tu_luan_80_bai.csv)
  protected readonly experimentalData = [
    { stt: 1, gv: 8.0, ht: 7.7, se: 0.3 },
    { stt: 2, gv: 7.0, ht: 7.4, se: 0.4 },
    { stt: 3, gv: 8.0, ht: 9.7, se: 1.7 },
    { stt: 4, gv: 9.25, ht: 8.6, se: 0.65 },
    { stt: 5, gv: 7.0, ht: 6.1, se: 0.9 },
    { stt: 6, gv: 7.0, ht: 6.4, se: 0.6 },
    { stt: 7, gv: 9.25, ht: 10.0, se: 0.75 },
    { stt: 8, gv: 8.25, ht: 8.6, se: 0.35 },
    { stt: 9, gv: 6.5, ht: 5.9, se: 0.6 },
    { stt: 10, gv: 8.0, ht: 8.6, se: 0.6 },
    { stt: 11, gv: 6.5, ht: 6.6, se: 0.1 },
    { stt: 12, gv: 6.5, ht: 7.6, se: 1.1 },
    { stt: 13, gv: 7.5, ht: 6.7, se: 0.8 },
    { stt: 14, gv: 4.75, ht: 4.4, se: 0.35 },
    { stt: 15, gv: 5.0, ht: 4.5, se: 0.5 },
    { stt: 16, gv: 6.5, ht: 4.8, se: 1.7 },
    { stt: 17, gv: 5.75, ht: 6.1, se: 0.35 },
    { stt: 18, gv: 7.75, ht: 8.1, se: 0.35 },
    { stt: 19, gv: 6.0, ht: 6.0, se: 0.0 },
    { stt: 20, gv: 5.25, ht: 5.0, se: 0.25 },
    { stt: 21, gv: 9.25, ht: 7.6, se: 1.65 },
    { stt: 22, gv: 7.0, ht: 6.5, se: 0.5 },
    { stt: 23, gv: 7.25, ht: 6.8, se: 0.45 },
    { stt: 24, gv: 5.25, ht: 4.3, se: 0.95 },
    { stt: 25, gv: 6.5, ht: 6.3, se: 0.2 },
    { stt: 26, gv: 7.25, ht: 7.7, se: 0.45 },
    { stt: 27, gv: 5.75, ht: 8.0, se: 2.25 },
    { stt: 28, gv: 7.75, ht: 8.0, se: 0.25 },
    { stt: 29, gv: 6.5, ht: 6.8, se: 0.3 },
    { stt: 30, gv: 6.75, ht: 6.7, se: 0.05 },
    { stt: 31, gv: 6.5, ht: 4.3, se: 2.2 },
    { stt: 32, gv: 9.75, ht: 9.7, se: 0.05 },
    { stt: 33, gv: 7.25, ht: 7.3, se: 0.05 },
    { stt: 34, gv: 5.75, ht: 8.6, se: 2.85 },
    { stt: 35, gv: 8.25, ht: 8.0, se: 0.25 },
    { stt: 36, gv: 5.5, ht: 5.9, se: 0.4 },
    { stt: 37, gv: 7.5, ht: 7.5, se: 0.0 },
    { stt: 38, gv: 4.5, ht: 3.1, se: 1.4 },
    { stt: 39, gv: 5.5, ht: 6.8, se: 1.3 },
    { stt: 40, gv: 7.5, ht: 8.4, se: 0.9 },
    { stt: 41, gv: 8.25, ht: 9.2, se: 0.95 },
    { stt: 42, gv: 7.5, ht: 6.4, se: 1.1 },
    { stt: 43, gv: 7.0, ht: 8.6, se: 1.6 },
    { stt: 44, gv: 6.75, ht: 5.1, se: 1.65 },
    { stt: 45, gv: 5.25, ht: 5.9, se: 0.65 },
    { stt: 46, gv: 6.25, ht: 8.8, se: 2.55 },
    { stt: 47, gv: 6.5, ht: 5.3, se: 1.2 },
    { stt: 48, gv: 8.75, ht: 8.1, se: 0.65 },
    { stt: 49, gv: 7.75, ht: 7.9, se: 0.15 },
    { stt: 50, gv: 5.0, ht: 4.4, se: 0.6 },
    { stt: 51, gv: 7.75, ht: 5.9, se: 1.85 },
    { stt: 52, gv: 6.75, ht: 6.8, se: 0.05 },
    { stt: 53, gv: 6.25, ht: 5.0, se: 1.25 },
    { stt: 54, gv: 8.0, ht: 8.6, se: 0.6 },
    { stt: 55, gv: 8.5, ht: 7.4, se: 1.1 },
    { stt: 56, gv: 8.5, ht: 10.0, se: 1.5 },
    { stt: 57, gv: 6.0, ht: 5.1, se: 0.9 },
    { stt: 58, gv: 6.75, ht: 6.4, se: 0.35 },
    { stt: 59, gv: 7.75, ht: 8.7, se: 0.95 },
    { stt: 60, gv: 8.5, ht: 7.1, se: 1.4 },
    { stt: 61, gv: 6.5, ht: 6.8, se: 0.3 },
    { stt: 62, gv: 7.0, ht: 8.5, se: 1.5 },
    { stt: 63, gv: 5.75, ht: 3.9, se: 1.85 },
    { stt: 64, gv: 5.75, ht: 6.0, se: 0.25 },
    { stt: 65, gv: 8.25, ht: 8.6, se: 0.35 },
    { stt: 66, gv: 9.0, ht: 9.9, se: 0.9 },
    { stt: 67, gv: 7.0, ht: 5.6, se: 1.4 },
    { stt: 68, gv: 8.5, ht: 7.0, se: 1.5 },
    { stt: 69, gv: 7.75, ht: 8.4, se: 0.65 },
    { stt: 70, gv: 6.25, ht: 6.6, se: 0.35 },
    { stt: 71, gv: 7.75, ht: 8.0, se: 0.25 },
    { stt: 72, gv: 9.25, ht: 9.7, se: 0.45 },
    { stt: 73, gv: 7.25, ht: 6.5, se: 0.75 },
    { stt: 74, gv: 9.25, ht: 9.5, se: 0.25 },
    { stt: 75, gv: 3.75, ht: 4.1, se: 0.35 },
    { stt: 76, gv: 8.25, ht: 7.4, se: 0.85 },
    { stt: 77, gv: 7.25, ht: 9.4, se: 2.15 },
    { stt: 78, gv: 6.75, ht: 7.3, se: 0.55 },
    { stt: 79, gv: 7.25, ht: 5.9, se: 1.35 },
    { stt: 80, gv: 4.5, ht: 5.3, se: 0.8 }
  ];

  constructor() {
    // Automatically re-render charts when signals update
    effect(() => {
      // Access signals to trigger dependency tracking
      this.history();
      this.currentMasteryLevels();
      this.chapterMasteryLevels();
      
      if (this.isBrowser) {
        setTimeout(() => this.renderCharts(), 0);
      }
    });
  }

  ngOnInit(): void {
    this.loadActiveExams();
    this.loadStudentSubmissions();

    // Fetch student list for admin/lecturer
    const user = this.currentUser();
    if (user && user.role === 'ADMIN') {
      this.mockService.fetchStudents().subscribe({
        next: (res) => {
          this.studentsList.set(res);
          this.selectedStudentId.set(user.id);
        },
        error: (err) => {
          console.error('Lỗi khi tải danh sách sinh viên:', err);
        }
      });
    }
  }

  protected loadActiveExams(): void {
    this.mockService.fetchExams().subscribe({
      next: (res) => {
        this.activeExams.set(res);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách đề thi:', err);
      }
    });
  }

  protected loadStudentSubmissions(studentId?: string): void {
    const user = this.mockService.currentUser();
    const userId = studentId || (user ? user.id : 'STU_001');
    this.mockService.fetchStudentExamSubmissions(userId).subscribe({
      next: (res) => {
        this.studentSubmissions.set(res);
      },
      error: (err) => {
        console.error('Lỗi khi tải lịch sử nộp bài thi:', err);
      }
    });
  }

  protected onStudentChange(studentId: string): void {
    this.selectedStudentId.set(studentId);
    this.mockService.refreshProgress(studentId);
    this.loadStudentSubmissions(studentId);
  }

  protected changeTab(tab: string): void {
    this.activeTab.set(tab);
    if (tab === 'progress' && this.isBrowser) {
      setTimeout(() => this.renderCharts(), 0);
    }
  }

  protected getLatestScoreForExam(examId: string): number | null {
    const sub = this.studentSubmissions().find(s => s.examId === examId);
    return sub ? sub.score : null;
  }

  protected getLatestSubmissionIdForExam(examId: string): string | null {
    const sub = this.studentSubmissions().find(s => s.examId === examId);
    return sub ? sub.id : null;
  }

  protected readonly latestExamSubmissions = computed(() => {
    return this.studentSubmissions().slice(0, 5);
  });

  // List of all questions
  protected readonly questions = computed(() => this.mockService.getQuestions());

  // Topics
  protected readonly topics = this.mockService.topics;

  // Submission History Signal
  protected readonly history = computed(() => this.mockService.submissionHistory());

  // Statistics
  protected readonly totalSubmissions = computed(() => this.history().length);
  
  protected readonly averageScore = computed(() => {
    const logs = this.history();
    if (logs.length === 0) return 0;
    const sum = logs.reduce((acc, log) => acc + log.score, 0);
    return parseFloat((sum / logs.length).toFixed(2));
  });

  protected readonly solvedCount = computed(() => {
    const logs = this.history();
    const uniqueQuestions = new Set(logs.map(log => log.questionId));
    return uniqueQuestions.size;
  });

  // Latest Submissions (limit 5)
  protected readonly latestSubmissions = computed(() => {
    return this.history().slice(0, 5);
  });

  // Filtered Questions
  protected readonly filteredQuestions = computed(() => {
    let list = this.questions();
    const topic = this.selectedTopic();
    const difficulty = this.selectedDifficulty();
    const bloom = this.selectedBloom();

    if (topic !== 'ALL') {
      list = list.filter(q => q.topic_id === topic);
    }
    if (difficulty !== 'ALL') {
      list = list.filter(q => q.difficulty === difficulty);
    }
    if (bloom !== 'ALL') {
      list = list.filter(q => q.bloom_level === bloom);
    }

    return list;
  });

  // Find latest score for a specific question ID
  protected getLatestScoreForQuestion(questionId: string): number | null {
    const questionSubmissions = this.history().filter(log => log.questionId === questionId);
    if (questionSubmissions.length === 0) return null;
    return questionSubmissions[0].score;
  }

  protected getLatestSubmissionIdForQuestion(questionId: string): string | null {
    const questionSubmissions = this.history().filter(log => log.questionId === questionId);
    if (questionSubmissions.length === 0) return null;
    return questionSubmissions[0].id;
  }

  protected onSlot1Change(type: string): void {
    this.slot1ChartType.set(type);
    if (this.isBrowser) {
      setTimeout(() => this.renderCharts(), 0);
    }
  }

  protected onSlot2Change(type: string): void {
    this.slot2ChartType.set(type);
    if (this.isBrowser) {
      setTimeout(() => this.renderCharts(), 0);
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.renderCharts();
    }
  }

  ngOnDestroy(): void {
    if (this.slot1ChartInstance) this.slot1ChartInstance.destroy();
    if (this.slot2ChartInstance) this.slot2ChartInstance.destroy();
  }

  private getChartConfig(type: string): any {
    const historyData = [...this.history()].reverse(); // oldest to newest for timeline

    if (type === 'growth_attempts') {
      const dates = historyData.map(log => {
        const d = new Date(log.evaluatedAt);
        return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      });
      const scores = historyData.map(log => log.score);

      return {
        type: 'line',
        data: {
          labels: dates.length > 0 ? dates : ['Chưa làm bài'],
          datasets: [{
            label: 'Điểm số đạt được',
            data: scores.length > 0 ? scores : [0],
            borderColor: '#FF6C37',
            backgroundColor: 'rgba(255, 108, 55, 0.08)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#FF6C37',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              padding: 10,
              backgroundColor: '#1e293b',
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: (context: any) => ` Điểm: ${context.parsed.y} / 10`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11, family: 'monospace' } }
            },
            y: {
              min: 0,
              max: 10,
              ticks: { stepSize: 2, font: { size: 11, family: 'monospace' } },
              grid: { color: '#f1f5f9' }
            }
          }
        }
      };
    } else if (type === 'growth_time') {
      const dayGroups: { [key: string]: number[] } = {};
      historyData.forEach(log => {
        const d = new Date(log.evaluatedAt);
        const dayStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        if (!dayGroups[dayStr]) {
          dayGroups[dayStr] = [];
        }
        dayGroups[dayStr].push(log.score);
      });

      const dayLabels = Object.keys(dayGroups).sort((a, b) => {
        const [da, ma, ya] = a.split('/').map(Number);
        const [db, mb, yb] = b.split('/').map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
      });

      const dayScores = dayLabels.map(day => {
        const scores = dayGroups[day];
        const sum = scores.reduce((a, b) => a + b, 0);
        return parseFloat((sum / scores.length).toFixed(2));
      });

      const shortLabels = dayLabels.map(day => {
        const [d, m] = day.split('/');
        return `${d}/${m}`;
      });

      return {
        type: 'line',
        data: {
          labels: shortLabels.length > 0 ? shortLabels : ['Không có dữ liệu'],
          datasets: [{
            label: 'Điểm trung bình ngày',
            data: dayScores.length > 0 ? dayScores : [0],
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.08)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#ec4899',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              padding: 10,
              backgroundColor: '#1e293b',
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: (context: any) => ` Điểm TB: ${context.parsed.y} / 10`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11, family: 'monospace' } }
            },
            y: {
              min: 0,
              max: 10,
              ticks: { stepSize: 2, font: { size: 11, family: 'monospace' } },
              grid: { color: '#f1f5f9' }
            }
          }
        }
      };
    } else if (type === 'mastery_topics') {
      const currentMastery = this.currentMasteryLevels();
      const topicLabels = this.topics.map(t => t.name);
      const topicAverages = this.topics.map(t => currentMastery[t.id] || 0.0);

      return {
        type: 'bar',
        data: {
          labels: topicLabels.map(label => label.length > 25 ? label.substring(0, 22) + '...' : label),
          datasets: [{
            label: 'Mức làm chủ chủ đề',
            data: topicAverages,
            backgroundColor: 'rgba(255, 108, 55, 0.85)',
            hoverBackgroundColor: '#FF6C37',
            borderColor: '#FF6C37',
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 32
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              callbacks: {
                label: (context: any) => ` Mức làm chủ: ${context.parsed.y} / 10`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 } }
            },
            y: {
              min: 0,
              max: 10,
              ticks: { stepSize: 2, font: { size: 11, family: 'monospace' } },
              grid: { color: '#f1f5f9' }
            }
          }
        }
      };
    } else if (type === 'mastery_clos') {
      const chapterMastery = this.chapterMasteryLevels();
      const closList = [
        { id: 'CHAP_C1', name: 'CLO 1 (Chương 1)' },
        { id: 'CHAP_C2', name: 'CLO 2 (Chương 2)' },
        { id: 'CHAP_C3', name: 'CLO 3 (Chương 3)' },
        { id: 'CHAP_C4', name: 'CLO 4 (Chương 4)' },
        { id: 'CHAP_C5', name: 'CLO 5 (Chương 5)' }
      ];

      const cloLabels = closList.map(c => c.name);
      const cloAverages = closList.map(c => chapterMastery[c.id] || 0.0);

      return {
        type: 'bar',
        data: {
          labels: cloLabels,
          datasets: [{
            label: 'Mức làm chủ Chuẩn đầu ra',
            data: cloAverages,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            hoverBackgroundColor: '#10b981',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 32
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              callbacks: {
                label: (context: any) => ` Mức làm chủ: ${context.parsed.y} / 10`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 } }
            },
            y: {
              min: 0,
              max: 10,
              ticks: { stepSize: 2, font: { size: 11, family: 'monospace' } },
              grid: { color: '#f1f5f9' }
            }
          }
        }
      };
    } else {
      const chapterMastery = this.chapterMasteryLevels();
      const chaptersList = [
        { id: 'CHAP_C1', name: 'C1: Tổng quan' },
        { id: 'CHAP_C2', name: 'C2: Tìm/Sắp xếp' },
        { id: 'CHAP_C3', name: 'C3: DSKL đơn' },
        { id: 'CHAP_C4', name: 'C4: Stack/Queue' },
        { id: 'CHAP_C5', name: 'C5: Cây BST' }
      ];

      const chapterLabels = chaptersList.map(c => c.name);
      const chapterAverages = chaptersList.map(c => chapterMastery[c.id] || 0.0);

      return {
        type: 'bar',
        data: {
          labels: chapterLabels,
          datasets: [{
            label: 'Mức làm chủ chương',
            data: chapterAverages,
            backgroundColor: 'rgba(79, 70, 229, 0.85)',
            hoverBackgroundColor: '#4f46e5',
            borderColor: '#4f46e5',
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 32
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              callbacks: {
                label: (context: any) => ` Mức làm chủ: ${context.parsed.y} / 10`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 } }
            },
            y: {
              min: 0,
              max: 10,
              ticks: { stepSize: 2, font: { size: 11, family: 'monospace' } },
              grid: { color: '#f1f5f9' }
            }
          }
        }
      };
    }
  }

  private renderCharts(): void {
    if (!this.isBrowser) return;

    if (this.slot1Canvas) {
      if (this.slot1ChartInstance) {
        this.slot1ChartInstance.destroy();
      }
      const config = this.getChartConfig(this.slot1ChartType());
      this.slot1ChartInstance = new Chart(this.slot1Canvas.nativeElement, config);
    }

    if (this.slot2Canvas) {
      if (this.slot2ChartInstance) {
        this.slot2ChartInstance.destroy();
      }
      const config = this.getChartConfig(this.slot2ChartType());
      this.slot2ChartInstance = new Chart(this.slot2Canvas.nativeElement, config);
    }
  }

  protected refreshDashboard(): void {
    if (this.isBrowser) {
      setTimeout(() => this.renderCharts(), 0);
    }
  }
}

