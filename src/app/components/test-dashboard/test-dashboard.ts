import { Component, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID, inject, signal, HostListener } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

interface ExamDataPoint {
  examName: string;
  overallScore: number;
  concepts: { [key: string]: number | null };
  clos: { [key: string]: number | null };
  chapters: { [key: string]: number | null };
}

@Component({
  selector: 'app-test-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './test-dashboard.html'
})
export class TestDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

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
      return count >= 2;
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

  // Student Profile Info
  protected readonly studentInfo = {
    name: "Nguyễn Văn B",
    id: "STU_001",
    className: "KHMT-01",
    major: "Khoa học Máy tính",
    overallTrend: "Cải thiện",
    overallSlope: "+0.65 / bài",
    summary: "Thành tích sinh viên cải thiện rõ rệt, đặc biệt tăng mạnh đối với các dạng bài tự luận mô tả."
  };

  // Detailed Concept Mastery Levels (All 14 DSA concepts)
  protected conceptsMastery: any[] = [];

  // CLOs Mastery Levels (extended 1 to 5)
  protected closMastery: any[] = [];

  // Chapters Mastery Levels (extended 1 to 5)
  protected chaptersMastery: any[] = [];

  // Strengths & Weaknesses
  protected readonly strengths = [
    { title: "Bubble Sort", detail: "Xác định đúng thứ tự logic các bước hoán đổi và vòng lặp." },
    { title: "BST", detail: "Khai báo chính xác cấu trúc nút và liên kết cây BST." },
    { title: "DSLK", detail: "Thực hiện đúng việc khởi tạo con trỏ và cập nhật liên kết nút." }
  ];

  protected readonly weaknesses = [
    { title: "Độ phức tạp", detail: "Thiếu công thức độ phức tạp trong câu trả lời mô tả." },
    { title: "Hàng đợi", detail: "Sai lệch vị trí thêm và lấy phần tử trong mã nguồn/câu trả lời." },
    { title: "Binary search", detail: "Sử dụng sai điều kiện dừng low < high thay vì low <= high." }
  ];

  // Personalized Recommendations (Dynamic based on weak concepts)
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

  // Static 4-exam history data (Algorithm 4 timeline points) - Extended CLO 1-5 and Chapter 1-5 and all 14 concepts
  private readonly examHistory: ExamDataPoint[] = [
    {
      examName: "Kiểm tra định kỳ lần 1",
      overallScore: 6.5,
      concepts: {
        bst: null, bubblesort: null, binarysearch: null, queue: null, complexity: 6.0,
        stack: 5.5, slinkedlist: 5.0, dlinkedlist: null, quicksort: null, recursion: 6.5,
        graph: null, hashtable: null, insertionsort: 6.0, selectionsort: 6.2
      },
      clos: { clo1: 6.0, clo2: 5.5, clo3: 5.0, clo4: 4.5, clo5: 7.0 },
      chapters: { chap1: 6.0, chap2: null, chap3: null, chap4: null, chap5: null }
    },
    {
      examName: "Kiểm tra định kỳ 2",
      overallScore: 7.2,
      concepts: {
        bst: null, bubblesort: 7.5, binarysearch: 7.0, queue: null, complexity: 7.0,
        stack: 6.5, slinkedlist: 6.0, dlinkedlist: 6.2, quicksort: null, recursion: 7.2,
        graph: null, hashtable: null, insertionsort: 6.8, selectionsort: 7.2
      },
      clos: { clo1: 6.8, clo2: 7.0, clo3: 6.5, clo4: 5.5, clo5: 7.5 },
      chapters: { chap1: 6.8, chap2: 7.0, chap3: null, chap4: null, chap5: null }
    },
    {
      examName: "Kiểm tra giữa kì",
      overallScore: 8.0,
      concepts: {
        bst: null, bubblesort: 8.2, binarysearch: 8.0, queue: 7.5, complexity: 7.8,
        stack: 7.8, slinkedlist: 7.5, dlinkedlist: 7.2, quicksort: null, recursion: 7.8,
        graph: null, hashtable: null, insertionsort: 8.0, selectionsort: 8.2
      },
      clos: { clo1: 7.5, clo2: 8.0, clo3: 7.2, clo4: 6.5, clo5: 8.5 },
      chapters: { chap1: 7.5, chap2: 8.0, chap3: 7.8, chap4: 7.5, chap5: null }
    },
    {
      examName: "Kiểm tra cuối kỳ",
      overallScore: 8.45,
      concepts: {
        bst: 8.4, bubblesort: 9.0, binarysearch: 8.2, queue: 8.2, complexity: 8.2,
        stack: 8.2, slinkedlist: 8.0, dlinkedlist: 7.5, quicksort: 7.8, recursion: 8.4,
        graph: 6.5, hashtable: 7.8, insertionsort: 8.5, selectionsort: 8.8
      },
      clos: { clo1: 8.1, clo2: 8.6, clo3: 7.8, clo4: 7.2, clo5: 9.0 },
      chapters: { chap1: 8.1, chap2: 8.6, chap3: 8.2, chap4: 8.0, chap5: 7.5 }
    }
  ];

  ngOnInit(): void {
    this.syncMasteryData();
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => this.renderCharts(), 200);
    }
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
    if (!this.isBrowser || !this.conceptsCanvas) return;

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
    if (!this.isBrowser) return;

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

    // Process CLO values dynamically using cumulative/accumulation logic with weights
    // Exam weights: Exam 1 = 1.5, Exam 2 = 1.5, Exam 3 = 3.0, Exam 4 = 4.0
    const computedHistory: any[] = [];

    for (let i = 0; i < this.examHistory.length; i++) {
      const exam = this.examHistory[i];
      computedHistory.push({
        examName: exam.examName,
        clos: {
          clo1: this.getCumulativeScore('clo1', i),
          clo2: this.getCumulativeScore('clo2', i),
          clo3: this.getCumulativeScore('clo3', i),
          clo4: this.getCumulativeScore('clo4', i),
          clo5: this.getCumulativeScore('clo5', i)
        }
      });
    }

    const getCloData = (cloKey: string) => {
      const data = computedHistory.map(h => h.clos[cloKey]);
      if (data[0] === null || data[0] === undefined) {
        data[0] = 0;
      }
      return data;
    };

    // 3. CLOs Chart (Updated for 5 CLOs)
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

    // 4. Chapters Chart (Updated for 5 Chapters)
    if (this.chaptersCanvas) {
      const ctx = this.chaptersCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.chaptersChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Chương 1',
                data: getChapData('chap1'),
                borderColor: '#6366f1',
                tension: 0.3,
                borderWidth: 1.2,
                pointRadius: 1.5,
                pointHoverRadius: 3,
                spanGaps: true
              },
              {
                label: 'Chương 2',
                data: getChapData('chap2'),
                borderColor: '#10b981',
                tension: 0.3,
                borderWidth: 1.2,
                pointRadius: 1.5,
                pointHoverRadius: 3,
                spanGaps: true
              },
              {
                label: 'Chương 3',
                data: getChapData('chap3'),
                borderColor: '#f59e0b',
                tension: 0.3,
                borderWidth: 1.2,
                pointRadius: 1.5,
                pointHoverRadius: 3,
                spanGaps: true
              },
              {
                label: 'Chương 4',
                data: getChapData('chap4'),
                borderColor: '#ec4899',
                tension: 0.3,
                borderWidth: 1.2,
                pointRadius: 1.5,
                pointHoverRadius: 3,
                spanGaps: true
              },
              {
                label: 'Chương 5',
                data: getChapData('chap5'),
                borderColor: '#06b6d4',
                tension: 0.3,
                borderWidth: 1.2,
                pointRadius: 1.5,
                pointHoverRadius: 3,
                spanGaps: true
              }
            ]
          },
          options: this.getChartOptions(true, 10)
        });
      }
    }
  }

  private getCumulativeScore(cloKey: string, upToIndex: number): number | null {
    const weights = [1.5, 1.5, 3.0, 4.0];
    const currentExam = this.examHistory[upToIndex];
    let isTested = false;

    if (cloKey === 'clo1') {
      isTested = currentExam.chapters['chap1'] !== null && currentExam.chapters['chap1'] !== undefined;
    } else if (cloKey === 'clo2' || cloKey === 'clo3') {
      isTested = currentExam.chapters['chap2'] !== null && currentExam.chapters['chap2'] !== undefined;
    } else if (cloKey === 'clo4' || cloKey === 'clo5') {
      isTested = (currentExam.chapters['chap3'] !== null && currentExam.chapters['chap3'] !== undefined) ||
                 (currentExam.chapters['chap4'] !== null && currentExam.chapters['chap4'] !== undefined) ||
                 (currentExam.chapters['chap5'] !== null && currentExam.chapters['chap5'] !== undefined);
    }

    if (!isTested) return null;

    let weightedSum = 0;
    let weightSum = 0;

    for (let j = 0; j <= upToIndex; j++) {
      const exam = this.examHistory[j];
      let score: number | null = null;

      if (cloKey === 'clo1') {
        if (exam.chapters['chap1'] !== null && exam.chapters['chap1'] !== undefined) {
          score = exam.chapters['chap1'];
        }
      } else if (cloKey === 'clo2') {
        if (exam.chapters['chap2'] !== null && exam.chapters['chap2'] !== undefined) {
          score = exam.chapters['chap2'];
        }
      } else if (cloKey === 'clo3') {
        if (exam.chapters['chap2'] !== null && exam.chapters['chap2'] !== undefined) {
          score = exam.chapters['chap2'] - 0.5;
        }
      } else if (cloKey === 'clo4' || cloKey === 'clo5') {
        const chap3to5 = [];
        if (exam.chapters['chap3'] !== null && exam.chapters['chap3'] !== undefined) chap3to5.push(exam.chapters['chap3']);
        if (exam.chapters['chap4'] !== null && exam.chapters['chap4'] !== undefined) chap3to5.push(exam.chapters['chap4']);
        if (exam.chapters['chap5'] !== null && exam.chapters['chap5'] !== undefined) chap3to5.push(exam.chapters['chap5']);

        if (chap3to5.length > 0) {
          const avg = chap3to5.reduce((sum, val) => sum + val, 0) / chap3to5.length;
          score = cloKey === 'clo4' ? avg : avg + 0.5;
        }
      }

      if (score !== null) {
        weightedSum += score * weights[j];
        weightSum += weights[j];
      }
    }

    return weightSum > 0 ? Number((weightedSum / weightSum).toFixed(2)) : null;
  }

  private syncMasteryData(): void {
    const cloNames = [
      'CLO 1: Hiểu được các khái niệm cơ bản về thuật toán, độ phức tạp và phương pháp biểu diễn thuật toán',
      'CLO 2: Phân tích bài toán tìm kiếm, xác định ràng buộc và đánh giá các giải pháp thuật toán phù hợp',
      'CLO 3: Phân tích bài toán sắp xếp, xác định ràng buộc và đánh giá giải pháp sắp xếp hiệu quả',
      'CLO 4: Mô tả và phân tích các cấu trúc dữ liệu cơ bản',
      'CLO 5: Thiết kế và mô tả giải pháp sử dụng cấu trúc dữ liệu và thuật toán để giải quyết các bài toán đơn giản'
    ];

    const computedHistory: any[] = [];
    for (let i = 0; i < this.examHistory.length; i++) {
      computedHistory.push({
        clos: {
          clo1: this.getCumulativeScore('clo1', i),
          clo2: this.getCumulativeScore('clo2', i),
          clo3: this.getCumulativeScore('clo3', i),
          clo4: this.getCumulativeScore('clo4', i),
          clo5: this.getCumulativeScore('clo5', i)
        }
      });
    }

    const latestClos = computedHistory[computedHistory.length - 1].clos;
    this.closMastery = cloNames.map((name, index) => {
      const cloKey = `clo${index + 1}`;
      const score = latestClos[cloKey] !== null ? latestClos[cloKey] : 0;
      return {
        name,
        score,
        status: score >= 5.0 ? 'Đạt' : 'Chưa đạt'
      };
    });

    const chapterNames = [
      'Chương 1: Tổng quan CTDL&GT',
      'Chương 2: Tìm kiếm và sắp xếp',
      'Chương 3: Danh sách liên kết',
      'Chương 4: Ngăn xếp, hàng đợi',
      'Chương 5: Cây nhị phân tìm kiếm'
    ];

    const getLatestChapterScore = (chapKey: string): number => {
      for (let i = this.examHistory.length - 1; i >= 0; i--) {
        const val = this.examHistory[i].chapters[chapKey];
        if (val !== null && val !== undefined) {
          return val;
        }
      }
      return 0;
    };

    this.chaptersMastery = chapterNames.map((name, index) => {
      const chapKey = `chap${index + 1}`;
      const score = getLatestChapterScore(chapKey);
      let grade = 'Yếu';
      if (score > 8.0) grade = 'Tốt';
      else if (score >= 7.0) grade = 'Khá';
      else if (score >= 5.0) grade = 'Trung bình';
      return { name, score, grade };
    });

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

    this.conceptsMastery = conceptDetails.map(c => {
      const history = this.examHistory
        .map(h => h.concepts[c.id])
        .filter(val => val !== null && val !== undefined) as number[];

      const score = history.length > 0 ? history[history.length - 1] : 0;
      let trend = 'stable';
      if (history.length >= 2) {
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        if (last > prev) trend = 'up';
        else if (last < prev) trend = 'down';
      } else if (history.length === 1 && score > 0) {
        trend = 'up';
      }

      let level = 'Yếu';
      if (score >= 8.8) level = 'Giỏi';
      else if (score >= 8.0) level = 'Khá tốt';
      else if (score >= 6.5) level = 'Khá';
      else if (score >= 5.0) level = 'Trung bình';

      return {
        name: c.name,
        score,
        level,
        trend
      };
    });

    // Map weaknesses list to recommendations dynamically
    const conceptMapByTitle: { [key: string]: string } = {
      "Độ phức tạp": "complexity",
      "Hàng đợi": "queue",
      "Binary search": "binarysearch"
    };

    this.recommendations = this.weaknesses.map(w => {
      const conceptId = conceptMapByTitle[w.title] || "";
      return {
        topic: w.title,
        advice: this.conceptAdviceMap[conceptId] || "Luyện tập thêm lý thuyết và bài tập thực hành liên quan đến chủ đề này."
      };
    });
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
