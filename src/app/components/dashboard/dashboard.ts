import { Component, ElementRef, ViewChild, OnInit, OnDestroy, PLATFORM_ID, inject, signal, HostListener } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Chart, registerables } from 'chart.js/auto';
import { TokenService } from '../../services/token.service';
import { StudentApiService } from '../../services/student-api.service';

Chart.register(...registerables);

interface ExamDataPoint {
  examName: string;
  overallScore: number;
  concepts: { [key: string]: number | null };
  clos: { [key: string]: number | null };
  chapters: { [key: string]: number | null };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly tokenService = inject(TokenService);
  private readonly studentApi = inject(StudentApiService);
  private readonly router = inject(Router);

  // 4 Chart canvas element references
  @ViewChild('overallCanvas') private overallCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('conceptsCanvas') private conceptsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('closCanvas') private closCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chaptersCanvas') private chaptersCanvas!: ElementRef<HTMLCanvasElement>;

  // 4 Chart.js instances
  private overallChart: Chart | null = null;
  private conceptsChart: Chart | null = null;
  private closChart: Chart | null = null;
  private chaptersChart: Chart | null = null;

  // Track if the custom dropdown is open
  protected readonly dropdownOpen = signal<boolean>(false);

  // Track if the concept mastery levels list is expanded
  protected readonly expanded = signal<boolean>(false);

  // Concept selection checkboxes checked states (All 14 DSA concepts)
  protected readonly checkedConcepts = signal<{ [key: string]: boolean }>({
    bst: false,
    bubblesort: true,
    binarysearch: true,
    queue: true,
    complexity: true,
    stack: false,
    slinkedlist: false,
    dlinkedlist: false,
    quicksort: false,
    recursion: false,
    graph: false,
    hashtable: false,
    insertionsort: false,
    selectionsort: false
  });

  // Available concepts to show in the selection bar
  protected readonly availableConcepts = [
    { id: 'bst', name: 'Cây BST' },
    { id: 'bubblesort', name: 'Bubble Sort' },
    { id: 'binarysearch', name: 'Nhị phân' },
    { id: 'queue', name: 'Hàng đợi' },
    { id: 'complexity', name: 'Độ phức tạp' },
    { id: 'stack', name: 'Ngăn xếp (Stack)' },
    { id: 'slinkedlist', name: 'DS liên kết đơn' },
    { id: 'dlinkedlist', name: 'DS liên kết kép' },
    { id: 'quicksort', name: 'Quick Sort' },
    { id: 'recursion', name: 'Đệ quy' },
    { id: 'graph', name: 'Đồ thị BFS/DFS' },
    { id: 'hashtable', name: 'Bảng băm' },
    { id: 'insertionsort', name: 'Sắp xếp chèn' },
    { id: 'selectionsort', name: 'Sắp xếp chọn' }
  ];

  protected toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  protected toggleExpanded(): void {
    this.expanded.update(e => !e);
  }

  protected getFilteredConcepts() {
    return this.availableConcepts.filter(c => {
      const count = this.examHistory.filter(h => h.concepts[c.id] !== null && h.concepts[c.id] !== undefined).length;
      return count >= 1; // Modified to 1 to show concepts tested at least once in dynamic mode
    });
  }

  protected getSelectedCount(): number {
    const filtered = this.getFilteredConcepts().map(c => c.id);
    return Object.entries(this.checkedConcepts())
      .filter(([key, val]) => val && filtered.includes(key))
      .length;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.dropdownOpen() && !target.closest('#concept-dropdown')) {
      this.dropdownOpen.set(false);
    }
  }

  // Student Profile Info (Dynamic)
  protected readonly studentInfo = {
    name: "",
    id: "",
    className: "KHMT-01",
    major: "Khoa học Máy tính",
    overallTrend: "Ổn định",
    overallSlope: "0.00 / bài",
    summary: "Đang tải dữ liệu..."
  };

  // Detailed Concept Mastery Levels
  protected conceptsMastery: any[] = [];

  // CLOs Mastery Levels
  protected closMastery: any[] = [];

  // Chapters Mastery Levels
  protected chaptersMastery: any[] = [];

  // Strengths & Weaknesses (Dynamic)
  protected strengths: any[] = [];
  protected weaknesses: any[] = [];
  protected recommendations: any[] = [];

  private readonly conceptAdviceMap: { [key: string]: string } = {
    bst: "Luyện tập vẽ cây, duyệt cây nhị phân tìm kiếm và các thao tác chèn/xóa nút.",
    bubblesort: "Củng cố ý tưởng hoán đổi các phần tử kề nhau và số vòng lặp trong thuật toán sắp xếp nổi bọt.",
    binarysearch: "Xem kỹ điều kiện chia đôi không gian tìm kiếm và cách cập nhật chỉ số left/right.",
    queue: "Ôn tập cơ chế hoạt động vào trước ra trước (FIFO) và các ứng dụng hàng đợi.",
    complexity: "Luyện tập xác định và phân tích độ phức tạp thời gian/không gian của các giải thuật cơ bản.",
    stack: "Ôn tập cơ chế hoạt động vào sau ra trước (LIFO) và các thao tác ngăn xếp cơ bản.",
    slinkedlist: "Thực hành quản lý liên kết đơn, khởi tạo nút và thêm/xóa nút ở đầu, cuối danh sách.",
    dlinkedlist: "Nắm vững cơ chế con trỏ đôi (prev và next) và các bước cập nhật liên kết nút an toàn.",
    quicksort: "Tìm hiểu kỹ thuật phân hoạch Lomuto/Hoare và cách chọn phần tử chốt (pivot).",
    recursion: "Xác định rõ ràng trường hợp cơ sở và bước đệ quy để tránh lặp vô hạn.",
    graph: "Thực hành các thuật toán duyệt đồ thị BFS, DFS và biểu diễn cấu trúc đồ thị.",
    hashtable: "Tìm hiểu phương pháp giải quyết đụng độ và hàm băm cơ bản.",
    insertionsort: "Nắm vững ý tưởng chèn phần tử hiện tại vào vị trí thích hợp trong đoạn đã sắp xếp.",
    selectionsort: "Ôn tập thao tác tìm phần tử nhỏ nhất trong đoạn chưa sắp xếp để hoán đổi."
  };

  // Dynamic exam history data loaded from DB
  private examHistory: ExamDataPoint[] = [];

  ngOnInit(): void {
    const user = this.tokenService.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.studentApi.fetchStudentProgress(user.id).subscribe({
      next: (res) => {
        if (res) {
          if (res.studentInfo) {
            this.studentInfo.name = res.studentInfo.name || user.full_name;
            this.studentInfo.id = res.studentInfo.id || user.id;
            this.studentInfo.className = res.studentInfo.className || "KHMT-01";
            this.studentInfo.major = res.studentInfo.major || "Khoa học Máy tính";
            this.studentInfo.overallTrend = res.studentInfo.overallTrend || "Ổn định";
            this.studentInfo.overallSlope = res.studentInfo.overallSlope || "0.00 / bài";
            this.studentInfo.summary = res.studentInfo.summary || "Hãy làm các đề thi để theo dõi tiến trình.";
          }

          this.examHistory = res.examHistory || [];
          this.strengths = res.strengths || [];
          this.weaknesses = res.weaknesses || [];
          this.recommendations = res.recommendations || [];

          // Set checked concepts based on which concepts actually have data in history
          const activeConceptsMap: { [key: string]: boolean } = {};
          this.availableConcepts.forEach(c => {
            const hasData = this.examHistory.some(h => h.concepts[c.id] !== null && h.concepts[c.id] !== undefined);
            activeConceptsMap[c.id] = hasData;
          });
          this.checkedConcepts.set(activeConceptsMap);

          this.syncMasteryData();

          if (this.isBrowser) {
            setTimeout(() => this.renderCharts(), 200);
          }
        }
      },
      error: (err) => {
        console.error("Lỗi tải tiến trình học tập:", err);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private destroyCharts(): void {
    if (this.overallChart) this.overallChart.destroy();
    if (this.conceptsChart) this.conceptsChart.destroy();
    if (this.closChart) this.closChart.destroy();
    if (this.chaptersChart) this.chaptersChart.destroy();
  }

  protected toggleConcept(key: string): void {
    this.checkedConcepts.update(c => {
      return { ...c, [key]: !c[key] };
    });
    if (this.isBrowser) {
      setTimeout(() => this.renderConceptsChart(), 0);
    }
  }

  private renderConceptsChart(): void {
    if (!this.isBrowser || !this.conceptsCanvas || this.examHistory.length === 0) return;

    if (this.conceptsChart) {
      this.conceptsChart.destroy();
    }

    const ctx = this.conceptsCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.examHistory.map(h => h.examName);
    const datasets: any[] = [];
    const checked = this.checkedConcepts();

    const conceptColors: { [key: string]: { label: string, color: string } } = {
      bst: { label: 'BST', color: '#4f46e5' },
      bubblesort: { label: 'Bubble', color: '#10b981' },
      binarysearch: { label: 'Nhị phân', color: '#f59e0b' },
      queue: { label: 'Queue', color: '#06b6d4' },
      complexity: { label: 'Độ phức tạp', color: '#ec4899' },
      stack: { label: 'Stack', color: '#8b5cf6' },
      slinkedlist: { label: 'DSLK Đơn', color: '#14b8a6' },
      dlinkedlist: { label: 'DSLK Kép', color: '#f43f5e' },
      quicksort: { label: 'Quick Sort', color: '#3b82f6' },
      recursion: { label: 'Đệ quy', color: '#a855f7' },
      graph: { label: 'Đồ thị', color: '#eab308' },
      hashtable: { label: 'Bảng băm', color: '#ef4444' },
      insertionsort: { label: 'Chèn', color: '#64748b' },
      selectionsort: { label: 'Chọn', color: '#10b981' }
    };

    const filtered = this.getFilteredConcepts().map(c => c.id);

    for (const key of Object.keys(conceptColors)) {
      if (checked[key] && filtered.includes(key)) {
        const conf = conceptColors[key];
        const data = this.examHistory.map(h => h.concepts[key]);
        if (data[0] === null || data[0] === undefined) {
          data[0] = 0;
        }
        datasets.push({
          label: conf.label,
          data: data,
          borderColor: conf.color,
          tension: 0.3,
          borderWidth: 1.2,
          pointRadius: 1.5,
          pointHoverRadius: 3,
          spanGaps: true
        });
      }
    }

    this.conceptsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: this.getChartOptions(true, 10)
    });
  }

  private renderCharts(): void {
    if (!this.isBrowser || this.examHistory.length === 0) return;

    this.destroyCharts();

    const labels = this.examHistory.map(h => h.examName);

    // 1. Overall Chart
    if (this.overallCanvas) {
      const ctx = this.overallCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.overallChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Điểm số Overall',
              data: this.examHistory.map(h => h.overallScore),
              borderColor: '#FF6C37',
              backgroundColor: 'rgba(255, 108, 55, 0.08)',
              borderWidth: 1.2,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#FF6C37',
              pointRadius: 2,
              pointHoverRadius: 3.5
            }]
          },
          options: this.getChartOptions(false, 10)
        });
      }
    }

    // 2. Concepts Chart
    this.renderConceptsChart();

    const getCloData = (cloKey: string) => {
      const data = this.examHistory.map(h => h.clos[cloKey]);
      if (data[0] === null || data[0] === undefined) {
        data[0] = 0;
      }
      return data;
    };

    // 3. CLOs Chart
    if (this.closCanvas) {
      const ctx = this.closCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.closChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              { label: 'CLO 1', data: getCloData('clo1'), borderColor: '#8b5cf6', tension: 0.25, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true },
              { label: 'CLO 2', data: getCloData('clo2'), borderColor: '#06b6d4', tension: 0.25, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true },
              { label: 'CLO 3', data: getCloData('clo3'), borderColor: '#f59e0b', tension: 0.25, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true },
              { label: 'CLO 4', data: getCloData('clo4'), borderColor: '#ec4899', tension: 0.25, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true },
              { label: 'CLO 5', data: getCloData('clo5'), borderColor: '#10b981', tension: 0.25, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true }
            ]
          },
          options: this.getChartOptions(true, 10)
        });
      }
    }

    const getChapData = (chapKey: string) => {
      const data = this.examHistory.map(h => h.chapters[chapKey]);
      if (data[0] === null || data[0] === undefined) {
        data[0] = 0;
      }
      return data;
    };

    // 4. Chapters Chart
    if (this.chaptersCanvas) {
      const ctx = this.chaptersCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.chaptersChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              { label: 'Chương 1', data: getChapData('chap1'), borderColor: '#6366f1', tension: 0.3, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true },
              { label: 'Chương 2', data: getChapData('chap2'), borderColor: '#10b981', tension: 0.3, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true },
              { label: 'Chương 3', data: getChapData('chap3'), borderColor: '#f59e0b', tension: 0.3, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true },
              { label: 'Chương 4', data: getChapData('chap4'), borderColor: '#ec4899', tension: 0.3, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true },
              { label: 'Chương 5', data: getChapData('chap5'), borderColor: '#06b6d4', tension: 0.3, borderWidth: 1.2, pointRadius: 1.5, pointHoverRadius: 3, spanGaps: true }
            ]
          },
          options: this.getChartOptions(true, 10)
        });
      }
    }
  }

  private syncMasteryData(): void {
    if (this.examHistory.length === 0) return;

    const cloNames = [
      'CLO 1: Hiểu được các khái niệm cơ bản về thuật toán, độ phức tạp và phương pháp biểu diễn thuật toán',
      'CLO 2: Phân tích bài toán tìm kiếm, xác định ràng buộc và đánh giá các giải pháp thuật toán phù hợp',
      'CLO 3: Phân tích bài toán sắp xếp, xác định ràng buộc và đánh giá giải pháp sắp xếp hiệu quả',
      'CLO 4: Mô tả và phân tích các cấu trúc dữ liệu cơ bản',
      'CLO 5: Thiết kế và mô tả giải pháp sử dụng cấu trúc dữ liệu và thuật toán để giải quyết các bài toán đơn giản'
    ];

    const latestExam = this.examHistory[this.examHistory.length - 1];

    const rawClos = cloNames.map((name, index) => {
      const cloKey = `clo${index + 1}`;
      const val = latestExam.clos[cloKey];
      return {
        name,
        score: val,
        status: val !== null && val !== undefined && (val as number) >= 5.0 ? 'Đạt' : 'Chưa đạt'
      };
    });
    this.closMastery = rawClos.filter(c => c.score !== null && c.score !== undefined && c.score > 0);

    const chapterNames = [
      'Chương 1: Tổng quan CTDL&GT',
      'Chương 2: Tìm kiếm và sắp xếp',
      'Chương 3: Danh sách liên kết',
      'Chương 4: Ngăn xếp, hàng đợi',
      'Chương 5: Cây nhị phân tìm kiếm'
    ];

    const rawChapters = chapterNames.map((name, index) => {
      const chapKey = `chap${index + 1}`;
      const score = latestExam.chapters[chapKey];
      let grade = 'Yếu';
      if (score !== null && score !== undefined) {
        const s = score as number;
        if (s > 8.0) grade = 'Tốt';
        else if (s >= 7.0) grade = 'Khá';
        else if (s >= 5.0) grade = 'Trung bình';
      }
      return { name, score, grade };
    });
    this.chaptersMastery = rawChapters.filter(c => c.score !== null && c.score !== undefined && c.score > 0);

    const conceptDetails = [
      { id: 'bst', name: 'Cây BST' },
      { id: 'bubblesort', name: 'Bubble Sort' },
      { id: 'binarysearch', name: 'Tìm kiếm nhị phân' },
      { id: 'queue', name: 'Hàng đợi (Queue)' },
      { id: 'complexity', name: 'Độ phức tạp O(log n)' },
      { id: 'stack', name: 'Ngăn xếp (Stack)' },
      { id: 'slinkedlist', name: 'DS liên kết đơn' },
      { id: 'dlinkedlist', name: 'DS liên kết kép' },
      { id: 'quicksort', name: 'Quick Sort' },
      { id: 'recursion', name: 'Đệ quy' },
      { id: 'graph', name: 'Đồ thị BFS/DFS' },
      { id: 'hashtable', name: 'Bảng băm' },
      { id: 'insertionsort', name: 'Sắp xếp chèn' },
      { id: 'selectionsort', name: 'Sắp xếp chọn' }
    ];

    const rawConcepts = conceptDetails.map(c => {
      const history = this.examHistory
        .map(h => h.concepts[c.id])
        .filter(val => val !== null && val !== undefined) as number[];

      const score = history.length > 0 ? history[history.length - 1] : null;
      let trend = 'stable';
      if (history.length >= 2) {
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        if (last > prev) trend = 'up';
        else if (last < prev) trend = 'down';
      } else if (history.length === 1 && score !== null && score > 0) {
        trend = 'up';
      }

      let level = 'Yếu';
      if (score !== null) {
        if (score >= 8.8) level = 'Giỏi';
        else if (score >= 8.0) level = 'Khá tốt';
        else if (score >= 6.5) level = 'Khá';
        else if (score >= 5.0) level = 'Trung bình';
      }

      return {
        name: c.name,
        score,
        level,
        trend
      };
    });
    this.conceptsMastery = rawConcepts.filter(c => c.score !== null && c.score !== undefined && c.score > 0);
  }

  private getChartOptions(showLegend: boolean, yMax: number, ySuffix: string = ''): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 8,
            font: { size: 8 },
            padding: 4
          }
        },
        tooltip: {
          padding: 6,
          backgroundColor: '#1e293b',
          titleFont: { size: 9 },
          bodyFont: { size: 9 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 8.5 } }
        },
        y: {
          min: 0,
          max: yMax,
          ticks: {
            stepSize: yMax / 5,
            font: { size: 8.5, family: 'monospace' },
            callback: (value: any) => `${value}${ySuffix}`
          },
          grid: { color: '#f8fafc' }
        }
      }
    };
  }
}
