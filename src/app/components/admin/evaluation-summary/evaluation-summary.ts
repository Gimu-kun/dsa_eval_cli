import { Component, ElementRef, OnInit, ViewChild, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { AdminMockDataService } from '../../../services/admin-mock-data.service';

interface MockResult {
  stt: number;
  teacherScore: number;
  systemScore: number;
  error: number;
}

@Component({
  selector: 'app-evaluation-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evaluation-summary.html'
})
export class EvaluationSummaryComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly mockDataService = inject(AdminMockDataService);

  @ViewChild('errorChart') errorChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('compareChart') compareChartRef!: ElementRef<HTMLCanvasElement>;
  
  errorChartInstance: any;
  compareChartInstance: any;

  exams = [
    'Kiểm tra thường kì lần 1',
    'Kiểm tra thường kì lần 2',
    'Kiểm tra giữa kì',
    'Kiểm tra cuối kì'
  ];

  selectedExam = signal<string>('Kiểm tra cuối kì');

  displayedResults = computed(() => {
    return this.mockDataService.mockDataMap()[this.selectedExam()] || [];
  });

  averageError = computed(() => {
    const results = this.displayedResults();
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, curr) => acc + curr.error, 0);
    return sum / results.length;
  });

  constructor() {}

  ngOnInit(): void {
    setTimeout(() => {
      this.drawCharts();
    }, 100);
  }

  onExamChange(event: any) {
    this.selectedExam.set(event.target.value);
    setTimeout(() => {
      this.drawCharts();
    }, 100);
  }

  protected editingStt = signal<number | null>(null);
  protected editScoreValue = signal<number>(0);

  startEditing(result: MockResult) {
    this.editingStt.set(result.stt);
    this.editScoreValue.set(result.teacherScore);
  }

  saveEditing(result: MockResult) {
    const newVal = this.editScoreValue();
    if (newVal >= 0 && newVal <= 10) {
      this.mockDataService.updateTeacherScore(this.selectedExam(), result.stt, newVal);
      // Update charts
      this.updateCharts();
    }
    this.editingStt.set(null);
  }

  cancelEditing() {
    this.editingStt.set(null);
  }

  viewDetails(result: MockResult) {
    // Navigate to a dynamic mock session URL
    this.router.navigate(['/evaluation', `MOCK_${this.selectedExam()}_${result.stt}`]);
  }

  private updateCharts() {
      this.drawCharts();
  }

  private drawCharts() {
    if (!this.errorChartRef || !this.compareChartRef) return;
    
    if (this.errorChartInstance) this.errorChartInstance.destroy();
    if (this.compareChartInstance) this.compareChartInstance.destroy();

    const data = this.displayedResults();
    if (data.length === 0) return;

    // 1. Error Distribution Chart
    const errorRanges = {
      'Tốt (< 0.5)': data.filter((d: MockResult) => d.error < 0.5).length,
      'Khá (0.5 - 1.0)': data.filter((d: MockResult) => d.error >= 0.5 && d.error <= 1.0).length,
      'Kém (> 1.0)': data.filter((d: MockResult) => d.error > 1.0).length,
    };

    const errorCounts = errorRanges;

    this.errorChartInstance = new Chart(this.errorChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: Object.keys(errorCounts),
        datasets: [{
          data: Object.values(errorCounts),
          backgroundColor: [
            '#10B981', // Tốt
            '#F59E0B', // Khá
            '#EF4444'  // Kém
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Phân bố Sai số' }
        },
        cutout: '70%'
      }
    });

    // --- Biểu đồ so sánh ---
    const labels = data.map((d: MockResult) => '#' + d.stt);
    const teacherScores = data.map((d: MockResult) => d.teacherScore);
    const systemScores = data.map((d: MockResult) => d.systemScore);

    this.compareChartInstance = new Chart(this.compareChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Điểm Giảng Viên',
            data: teacherScores,
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 2
          },
          {
            label: 'Điểm Hệ Thống',
            data: systemScores,
            borderColor: '#ff6c37',
            backgroundColor: '#ff6c37',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: { display: true, text: 'So sánh Điểm hệ thống vs Điểm giảng viên' }
        },
        scales: {
          y: { min: 0, max: 10 }
        }
      }
    });
  }
}
