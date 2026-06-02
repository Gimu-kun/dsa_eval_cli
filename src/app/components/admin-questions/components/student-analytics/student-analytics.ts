import { Component, inject, signal, ElementRef, ViewChild, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../../../services/mock-data.service';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

@Component({
  selector: 'app-student-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-analytics.html'
})
export class StudentAnalyticsComponent implements OnInit, OnDestroy {
  private readonly mockService = inject(MockDataService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly successMessage = signal<string>('');
  protected readonly errorMessage = signal<string>('');
  protected readonly isLoadingProgress = signal<boolean>(false);
  protected readonly studentProgress = signal<any>(null);

  protected readonly studentsList = signal<any[]>([]);
  protected selectedStudentId = '';

  protected readonly selectedSubmission = signal<any>(null);
  protected readonly showSubmissionModal = signal<boolean>(false);

  // References to Chart Canvas elements
  @ViewChild('growthChart') private growthCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('masteryChart') private masteryCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chapterChart') private chapterCanvas!: ElementRef<HTMLCanvasElement>;

  private growthChartInstance: Chart | null = null;
  private masteryChartInstance: Chart | null = null;
  private chapterChartInstance: Chart | null = null;

  ngOnInit(): void {
    this.loadStudents();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  protected loadStudents(): void {
    this.mockService.fetchStudents().subscribe({
      next: (res) => {
        this.studentsList.set(res);
        if (res.length > 0 && !this.selectedStudentId) {
          this.selectedStudentId = res[0].id;
          this.onStudentChange();
        }
      },
      error: (err) => console.error('Lỗi khi tải danh sách học viên:', err)
    });
  }

  protected onStudentChange(): void {
    if (!this.selectedStudentId) {
      this.studentProgress.set(null);
      this.destroyCharts();
      return;
    }

    this.isLoadingProgress.set(true);
    this.studentProgress.set(null);
    this.destroyCharts();

    this.mockService.fetchStudentProgress(this.selectedStudentId).subscribe({
      next: (res) => {
        // Map snake_case properties to camelCase for local studentProgress mapping
        const mappedHistory = (res.history || []).map((item: any) => {
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

        const mappedRes = {
          ...res,
          overallExamSlope: res.overall_exam_slope !== undefined ? res.overall_exam_slope : (res.overallExamSlope !== undefined ? res.overallExamSlope : 0),
          overallExamTrend: res.overall_exam_trend || res.overallExamTrend || 'STABLE',
          currentMasteryLevels: res.current_mastery_levels || res.currentMasteryLevels || {},
          chapterMasteryLevels: res.chapter_mastery_levels || res.chapterMasteryLevels || {},
          history: mappedHistory
        };

        this.studentProgress.set(mappedRes);
        this.isLoadingProgress.set(false);
        setTimeout(() => this.renderCharts(), 100);
      },
      error: (err) => {
        console.error('Lỗi khi tải tiến trình học viên:', err);
        this.isLoadingProgress.set(false);
      }
    });
  }

  protected getStudentTotalSubmissions(): number {
    const prog = this.studentProgress();
    return prog && prog.history ? prog.history.length : 0;
  }

  protected getStudentAverageScore(): number {
    const prog = this.studentProgress();
    if (!prog || !prog.history || prog.history.length === 0) return 0;
    const sum = prog.history.reduce((acc: number, log: any) => acc + log.score, 0);
    return parseFloat((sum / prog.history.length).toFixed(2));
  }

  protected getStudentSolvedCount(): number {
    const prog = this.studentProgress();
    if (!prog || !prog.history) return 0;
    const uniqueQuestions = new Set(prog.history.map((log: any) => log.questionId));
    return uniqueQuestions.size;
  }

  protected openSubmissionDetails(sub: any): void {
    this.selectedSubmission.set(sub);
    this.showSubmissionModal.set(true);
  }

  protected closeSubmissionModal(): void {
    this.selectedSubmission.set(null);
    this.showSubmissionModal.set(false);
  }

  private destroyCharts(): void {
    if (this.growthChartInstance) {
      this.growthChartInstance.destroy();
      this.growthChartInstance = null;
    }
    if (this.masteryChartInstance) {
      this.masteryChartInstance.destroy();
      this.masteryChartInstance = null;
    }
    if (this.chapterChartInstance) {
      this.chapterChartInstance.destroy();
      this.chapterChartInstance = null;
    }
  }

  private renderCharts(): void {
    if (!this.isBrowser) return;
    
    const progress = this.studentProgress();
    if (!progress) return;

    this.destroyCharts();

    const historyData = [...(progress.history || [])].reverse();

    // 1. Render Growth Chart
    if (this.growthCanvas) {
      const dates = historyData.map((log: any) => {
        const d = new Date(log.evaluatedAt);
        return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      });
      const scores = historyData.map((log: any) => log.score);

      this.growthChartInstance = new Chart(this.growthCanvas.nativeElement, {
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
                label: (context) => ` Điểm: ${context.parsed.y} / 10`
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
      });
    }

    // 2. Render Topic Mastery Chart
    if (this.masteryCanvas) {
      const currentMastery = progress.currentMasteryLevels || {};
      const topicLabels = this.mockService.topics.map(t => t.name);
      const topicAverages = this.mockService.topics.map(t => currentMastery[t.id] || 0.0);

      this.masteryChartInstance = new Chart(this.masteryCanvas.nativeElement, {
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
                label: (context) => ` Mức làm chủ: ${context.parsed.y} / 10`
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
      });
    }

    // 3. Render Chapter Mastery Chart
    if (this.chapterCanvas) {
      const chapterMastery = progress.chapterMasteryLevels || {};
      const chaptersList = [
        { id: 'CHAP_C1', name: 'C1: Tổng quan' },
        { id: 'CHAP_C2', name: 'C2: Tìm/Sắp xếp' },
        { id: 'CHAP_C3', name: 'C3: DSKL đơn' },
        { id: 'CHAP_C4', name: 'C4: Stack/Queue' },
        { id: 'CHAP_C5', name: 'C5: Cây BST' }
      ];

      const chapterLabels = chaptersList.map(c => c.name);
      const chapterAverages = chaptersList.map(c => chapterMastery[c.id] || 0.0);

      this.chapterChartInstance = new Chart(this.chapterCanvas.nativeElement, {
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
                label: (context) => ` Mức làm chủ: ${context.parsed.y} / 10`
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
      });
    }
  }
}
