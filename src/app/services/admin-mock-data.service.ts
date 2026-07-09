import { Injectable, signal } from '@angular/core';

export interface MockResult {
  stt: number;
  teacherScore: number;
  systemScore: number;
  error: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminMockDataService {
  private readonly allResults = [
    { stt: 1, teacherScore: 8.0, systemScore: 7.7, error: 0.3 },
    { stt: 2, teacherScore: 7.0, systemScore: 7.4, error: 0.4 },
    { stt: 3, teacherScore: 9.0, systemScore: 8.6, error: 0.4 },
    { stt: 4, teacherScore: 6.5, systemScore: 5.9, error: 0.6 },
    { stt: 5, teacherScore: 7.5, systemScore: 7.2, error: 0.3 },
    { stt: 6, teacherScore: 8.5, systemScore: 8.1, error: 0.4 },
    { stt: 7, teacherScore: 9.5, systemScore: 10.0, error: 0.5 },
    { stt: 8, teacherScore: 5.0, systemScore: 5.6, error: 0.6 },
    { stt: 9, teacherScore: 8.0, systemScore: 7.8, error: 0.2 },
    { stt: 10, teacherScore: 7.5, systemScore: 8.2, error: 0.7 },
    { stt: 11, teacherScore: 6.0, systemScore: 6.5, error: 0.5 },
    { stt: 12, teacherScore: 8.5, systemScore: 8.3, error: 0.2 },
    { stt: 13, teacherScore: 9.0, systemScore: 9.4, error: 0.4 },
    { stt: 14, teacherScore: 7.0, systemScore: 6.3, error: 0.7 },
    { stt: 15, teacherScore: 8.5, systemScore: 8.7, error: 0.2 },
    { stt: 16, teacherScore: 4.5, systemScore: 5.2, error: 0.7 },
    { stt: 17, teacherScore: 7.5, systemScore: 7.0, error: 0.5 },
    { stt: 18, teacherScore: 8.0, systemScore: 8.5, error: 0.5 },
    { stt: 19, teacherScore: 9.0, systemScore: 8.8, error: 0.2 },
    { stt: 20, teacherScore: 6.5, systemScore: 7.1, error: 0.6 },
    { stt: 21, teacherScore: 7.0, systemScore: 6.8, error: 0.2 },
    { stt: 22, teacherScore: 8.5, systemScore: 8.1, error: 0.4 },
    { stt: 23, teacherScore: 9.5, systemScore: 9.2, error: 0.3 },
    { stt: 24, teacherScore: 5.5, systemScore: 6.0, error: 0.5 },
    { stt: 25, teacherScore: 8.0, systemScore: 7.6, error: 0.4 },
    { stt: 26, teacherScore: 7.5, systemScore: 8.1, error: 0.6 },
    { stt: 27, teacherScore: 6.5, systemScore: 5.7, error: 0.8 },
    { stt: 28, teacherScore: 8.5, systemScore: 9.0, error: 0.5 },
    { stt: 29, teacherScore: 9.0, systemScore: 8.5, error: 0.5 },
    { stt: 30, teacherScore: 7.0, systemScore: 7.3, error: 0.3 },
    { stt: 31, teacherScore: 8.0, systemScore: 8.6, error: 0.6 },
    { stt: 32, teacherScore: 9.5, systemScore: 9.9, error: 0.4 },
    { stt: 33, teacherScore: 7.5, systemScore: 7.0, error: 0.5 },
    { stt: 34, teacherScore: 6.0, systemScore: 5.5, error: 0.5 },
    { stt: 35, teacherScore: 8.5, systemScore: 8.8, error: 0.3 },
    { stt: 36, teacherScore: 7.0, systemScore: 7.4, error: 0.4 },
    { stt: 37, teacherScore: 9.0, systemScore: 8.2, error: 0.8 },
    { stt: 38, teacherScore: 8.0, systemScore: 7.5, error: 0.5 },
    { stt: 39, teacherScore: 6.5, systemScore: 6.9, error: 0.4 },
    { stt: 40, teacherScore: 7.5, systemScore: 7.1, error: 0.4 },
    { stt: 41, teacherScore: 8.5, systemScore: 8.9, error: 0.4 },
    { stt: 42, teacherScore: 9.5, systemScore: 9.1, error: 0.4 },
    { stt: 43, teacherScore: 5.0, systemScore: 4.6, error: 0.4 },
    { stt: 44, teacherScore: 8.0, systemScore: 8.5, error: 0.5 },
    { stt: 45, teacherScore: 7.5, systemScore: 6.8, error: 0.7 },
    { stt: 46, teacherScore: 6.5, systemScore: 7.2, error: 0.7 },
    { stt: 47, teacherScore: 8.5, systemScore: 8.0, error: 0.5 },
    { stt: 48, teacherScore: 9.0, systemScore: 9.6, error: 0.6 },
    { stt: 49, teacherScore: 7.0, systemScore: 6.5, error: 0.5 },
    { stt: 50, teacherScore: 8.0, systemScore: 8.4, error: 0.4 },
    { stt: 51, teacherScore: 7.5, systemScore: 7.9, error: 0.4 },
    { stt: 52, teacherScore: 9.5, systemScore: 8.8, error: 0.7 },
    { stt: 53, teacherScore: 6.0, systemScore: 5.8, error: 0.2 },
    { stt: 54, teacherScore: 8.5, systemScore: 9.1, error: 0.6 },
    { stt: 55, teacherScore: 7.0, systemScore: 7.5, error: 0.5 },
    { stt: 56, teacherScore: 9.0, systemScore: 8.3, error: 0.7 },
    { stt: 57, teacherScore: 8.0, systemScore: 8.2, error: 0.2 },
    { stt: 58, teacherScore: 6.5, systemScore: 6.0, error: 0.5 },
    { stt: 59, teacherScore: 7.5, systemScore: 7.7, error: 0.2 },
    { stt: 60, teacherScore: 8.5, systemScore: 8.4, error: 0.1 },
    { stt: 61, teacherScore: 9.25, systemScore: 9.5, error: 0.25 },
    { stt: 62, teacherScore: 7.75, systemScore: 8.1, error: 0.35 },
    { stt: 63, teacherScore: 8.5, systemScore: 8.0, error: 0.5 },
    { stt: 64, teacherScore: 5.75, systemScore: 6.0, error: 0.25 },
    { stt: 65, teacherScore: 8.25, systemScore: 8.6, error: 0.35 },
    { stt: 66, teacherScore: 9.0, systemScore: 9.9, error: 0.9 },
    { stt: 67, teacherScore: 7.0, systemScore: 5.6, error: 1.4 },
    { stt: 68, teacherScore: 8.5, systemScore: 7.0, error: 1.5 },
    { stt: 69, teacherScore: 7.75, systemScore: 8.4, error: 0.65 },
    { stt: 70, teacherScore: 6.25, systemScore: 6.6, error: 0.35 },
    { stt: 71, teacherScore: 7.75, systemScore: 8.0, error: 0.25 },
    { stt: 72, teacherScore: 9.25, systemScore: 9.7, error: 0.45 },
    { stt: 73, teacherScore: 7.25, systemScore: 6.5, error: 0.75 },
    { stt: 74, teacherScore: 9.25, systemScore: 9.5, error: 0.25 },
    { stt: 75, teacherScore: 3.75, systemScore: 4.1, error: 0.35 },
    { stt: 76, teacherScore: 8.25, systemScore: 7.4, error: 0.85 },
    { stt: 77, teacherScore: 7.25, systemScore: 9.4, error: 2.15 },
    { stt: 78, teacherScore: 6.75, systemScore: 7.3, error: 0.55 },
    { stt: 79, teacherScore: 7.25, systemScore: 5.9, error: 1.35 },
    { stt: 80, teacherScore: 4.5, systemScore: 5.3, error: 0.8 }
  ];

  public mockDataMap = signal<Record<string, MockResult[]>>({});

  constructor() {
    const data: Record<string, MockResult[]> = {};
    data['Kiểm tra cuối kì'] = JSON.parse(JSON.stringify(this.allResults));
    data['Kiểm tra thường kì lần 1'] = this.generateMockData(80, 7.5, 0.6);
    data['Kiểm tra thường kì lần 2'] = this.generateMockData(80, 8.0, 0.8);
    data['Kiểm tra giữa kì'] = this.generateMockData(80, 6.5, 1.2);
    this.mockDataMap.set(data);
  }

  private generateMockData(count: number, avgScore: number, maxError: number): MockResult[] {
    const results: MockResult[] = [];
    for (let i = 1; i <= count; i++) {
      let teacherScore = avgScore + (Math.random() * 4 - 2); 
      teacherScore = Math.max(1, Math.min(10, teacherScore));
      teacherScore = Math.round(teacherScore * 4) / 4; 
      
      let systemScore = teacherScore + (Math.random() * maxError * 2 - maxError);
      systemScore = Math.max(1, Math.min(10, systemScore));
      systemScore = Math.round(systemScore * 10) / 10;
      
      let error = Math.abs(systemScore - teacherScore);
      error = Math.round(error * 100) / 100;
      
      results.push({ stt: i, teacherScore, systemScore, error });
    }
    return results;
  }

  public updateTeacherScore(examName: string, stt: number, newScore: number): void {
    const data = this.mockDataMap();
    const examData = data[examName];
    if (examData) {
      const item = examData.find(x => x.stt === stt);
      if (item) {
        item.teacherScore = newScore;
        item.error = Math.round(Math.abs(item.systemScore - item.teacherScore) * 100) / 100;
        this.mockDataMap.set({ ...data }); // trigger reactivity
      }
    }
  }

  public generateSubmissionReport(examName: string, stt: number): any {
    const data = this.mockDataMap();
    const item = data[examName]?.find(x => x.stt === stt);
    if (!item) return null;

    // Generate dynamic submission based on systemScore
    const systemScore = item.systemScore;
    let scoreStr = systemScore.toFixed(2);
    let grade = systemScore >= 8 ? 'Giỏi' : systemScore >= 6.5 ? 'Khá' : systemScore >= 5 ? 'Trung bình' : 'Yếu';

    return {
      examTitle: examName,
      studentName: `Học sinh mẫu #${stt}`,
      score: systemScore,
      maxScore: 10,
      timeSpent: Math.floor(Math.random() * 20) + 40,
      feedback: `Đánh giá tổng quan: Sinh viên đạt mức ${grade}. Điểm số do hệ thống chấm: ${scoreStr}/10.
- **Chương {Cây Tìm Kiếm Nhị Phân}** (Tỉ lệ: 85.00%): {Mạnh (Strong)} - đạt kết quả xuất sắc
- **{CLO 3}** (Tỉ lệ: 80.00%): {Đạt (Meets)}
- Câu 1 - Mức Bloom: {UNDERSTANDING}, Kết quả: {Đạt (Achieved)} (Điểm: ${systemScore}/10)`,
      cloStats: [
        { name: "Hiểu cấu trúc dữ liệu", prevScore: 5, increment: 3, target: 8, result: "Tốt" },
        { name: "Áp dụng thuật toán", prevScore: 4, increment: 2, target: 7, result: "Khá" }
      ],
      questionResults: [
        {
          questionType: "Cây Tìm Kiếm Nhị Phân",
          questionText: "Hãy viết code chèn một node vào BST.",
          code: "function insert(root, val) {\n  if(!root) return new Node(val);\n  if(val < root.val) root.left = insert(root.left, val);\n  else root.right = insert(root.right, val);\n  return root;\n}",
          feedback: `Chính xác! Thuật toán chèn hoạt động đúng.\n- Khái niệm: 100%\n- Quan hệ: 100%`,
          score: systemScore,
          maxScore: 10
        }
      ]
    };
  }
}
