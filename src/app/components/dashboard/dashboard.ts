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
  private readonly mockService = inject(MockDataService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly activeExams = signal<any[]>([]);
  protected readonly studentSubmissions = signal<any[]>([]);

  // Expose signals from MockDataService
  protected readonly overallExamSlope = this.mockService.overallExamSlope;
  protected readonly overallExamTrend = this.mockService.overallExamTrend;
  protected readonly currentMasteryLevels = this.mockService.currentMasteryLevels;
  protected readonly chapterMasteryLevels = this.mockService.chapterMasteryLevels;
  protected readonly recommendations = this.mockService.recommendations;

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

  protected loadStudentSubmissions(): void {
    const user = this.mockService.currentUser();
    const userId = user ? user.id : 'STU_001';
    this.mockService.fetchStudentExamSubmissions(userId).subscribe({
      next: (res) => {
        this.studentSubmissions.set(res);
      },
      error: (err) => {
        console.error('Lỗi khi tải lịch sử nộp bài thi:', err);
      }
    });
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

