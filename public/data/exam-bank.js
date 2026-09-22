window.ENGO_EXAM_BANK = {
  levels: [
    { id: "NB", name: "Nhận biết", desc: "Nhắc lại từ vựng, cấu trúc đã học" },
    { id: "TH", name: "Thông hiểu", desc: "Giải thích, chọn đúng trong ngữ cảnh quen thuộc" },
    { id: "VD", name: "Vận dụng", desc: "Dùng kiến thức vào tình huống mới" },
    { id: "VDC", name: "Vận dụng cao", desc: "Viết, nói, suy luận tổng hợp" }
  ],

  specs: [
    { id: "hk1-ttx-1", type: "KTTX", term: 1, order: 1, name: "Thường xuyên 1 · Unit 1",
      minutes: 15, units: [1], form: "Trắc nghiệm + điền từ",
      sections: [
        { skill: "Ngữ âm", n: 4, pts: 2 },
        { skill: "Từ vựng – Ngữ pháp", n: 8, pts: 4 },
        { skill: "Đọc hiểu", n: 4, pts: 2 },
        { skill: "Viết câu", n: 2, pts: 2 }
      ],
      matrix: { NB: 40, TH: 40, VD: 20, VDC: 0 } },

    { id: "hk1-ttx-2", type: "KTTX", term: 1, order: 2, name: "Thường xuyên 2 · Unit 2",
      minutes: 15, units: [2], form: "Trắc nghiệm + điền từ",
      sections: [
        { skill: "Ngữ âm", n: 4, pts: 2 },
        { skill: "Từ vựng – Ngữ pháp", n: 8, pts: 4 },
        { skill: "Đọc hiểu", n: 4, pts: 2 },
        { skill: "Viết câu", n: 2, pts: 2 }
      ],
      matrix: { NB: 40, TH: 40, VD: 20, VDC: 0 } },

    { id: "hk1-ttx-3", type: "KTTX", term: 1, order: 3, name: "Thường xuyên 3 · Nói (Unit 3–4)",
      minutes: 15, units: [3, 4], form: "Nói trực tiếp, chấm bằng Phòng Luyện Nói",
      sections: [
        { skill: "Nói · Phát âm", n: 5, pts: 4 },
        { skill: "Nói · Trôi chảy", n: 3, pts: 3 },
        { skill: "Nói · Nội dung", n: 2, pts: 3 }
      ],
      matrix: { NB: 20, TH: 30, VD: 30, VDC: 20 } },

    { id: "hk1-ttx-4", type: "KTTX", term: 1, order: 4, name: "Thường xuyên 4 · Viết (Unit 5–6)",
      minutes: 15, units: [5, 6], form: "Viết đoạn 80–100 từ, chấm bằng Xưởng Luyện Viết",
      sections: [
        { skill: "Viết · Hoàn thành yêu cầu", n: 1, pts: 3 },
        { skill: "Viết · Mạch lạc", n: 1, pts: 2 },
        { skill: "Viết · Từ vựng", n: 1, pts: 2 },
        { skill: "Viết · Ngữ pháp", n: 1, pts: 3 }
      ],
      matrix: { NB: 10, TH: 20, VD: 40, VDC: 30 } },

    { id: "hk1-gk", type: "KTGK", term: 1, name: "Giữa học kì I · Unit 1–3",
      minutes: 60, units: [1, 2, 3], form: "Đề chung toàn khối",
      sections: [
        { skill: "Nghe", n: 8, pts: 2 },
        { skill: "Ngữ âm", n: 4, pts: 1 },
        { skill: "Từ vựng – Ngữ pháp", n: 12, pts: 3 },
        { skill: "Đọc hiểu", n: 8, pts: 2 },
        { skill: "Viết", n: 4, pts: 2 }
      ],
      matrix: { NB: 30, TH: 40, VD: 20, VDC: 10 } },

    { id: "hk1-ck", type: "KTCK", term: 1, name: "Cuối học kì I · Unit 1–6",
      minutes: 60, units: [1, 2, 3, 4, 5, 6], form: "Đề chung toàn khối",
      sections: [
        { skill: "Nghe", n: 10, pts: 2 },
        { skill: "Ngữ âm", n: 4, pts: 1 },
        { skill: "Từ vựng – Ngữ pháp", n: 14, pts: 3 },
        { skill: "Đọc hiểu", n: 10, pts: 2 },
        { skill: "Viết", n: 5, pts: 2 }
      ],
      matrix: { NB: 30, TH: 40, VD: 20, VDC: 10 } },

    { id: "hk2-ttx-1", type: "KTTX", term: 2, order: 1, name: "Thường xuyên 1 · Unit 7",
      minutes: 15, units: [7], form: "Trắc nghiệm + điền từ",
      sections: [
        { skill: "Ngữ âm", n: 4, pts: 2 },
        { skill: "Từ vựng – Ngữ pháp", n: 8, pts: 4 },
        { skill: "Đọc hiểu", n: 4, pts: 2 },
        { skill: "Viết câu", n: 2, pts: 2 }
      ],
      matrix: { NB: 40, TH: 40, VD: 20, VDC: 0 } },

    { id: "hk2-ttx-2", type: "KTTX", term: 2, order: 2, name: "Thường xuyên 2 · Unit 8",
      minutes: 15, units: [8], form: "Trắc nghiệm + điền từ",
      sections: [
        { skill: "Ngữ âm", n: 4, pts: 2 },
        { skill: "Từ vựng – Ngữ pháp", n: 8, pts: 4 },
        { skill: "Đọc hiểu", n: 4, pts: 2 },
        { skill: "Viết câu", n: 2, pts: 2 }
      ],
      matrix: { NB: 40, TH: 40, VD: 20, VDC: 0 } },

    { id: "hk2-ttx-3", type: "KTTX", term: 2, order: 3, name: "Thường xuyên 3 · Nghe (Unit 9–10)",
      minutes: 15, units: [9, 10], form: "Nghe 3 đoạn, chấm tự động",
      sections: [
        { skill: "Nghe · Ý chính", n: 4, pts: 3 },
        { skill: "Nghe · Chi tiết", n: 4, pts: 4 },
        { skill: "Nghe · Điền từ", n: 3, pts: 3 }
      ],
      matrix: { NB: 30, TH: 40, VD: 30, VDC: 0 } },

    { id: "hk2-ttx-4", type: "KTTX", term: 2, order: 4, name: "Thường xuyên 4 · Viết (Unit 11–12)",
      minutes: 15, units: [11, 12], form: "Viết đoạn 100–120 từ, chấm bằng Xưởng Luyện Viết",
      sections: [
        { skill: "Viết · Hoàn thành yêu cầu", n: 1, pts: 3 },
        { skill: "Viết · Mạch lạc", n: 1, pts: 2 },
        { skill: "Viết · Từ vựng", n: 1, pts: 2 },
        { skill: "Viết · Ngữ pháp", n: 1, pts: 3 }
      ],
      matrix: { NB: 10, TH: 20, VD: 40, VDC: 30 } },

    { id: "hk2-gk", type: "KTGK", term: 2, name: "Giữa học kì II · Unit 7–9",
      minutes: 60, units: [7, 8, 9], form: "Đề chung toàn khối",
      sections: [
        { skill: "Nghe", n: 8, pts: 2 },
        { skill: "Ngữ âm", n: 4, pts: 1 },
        { skill: "Từ vựng – Ngữ pháp", n: 12, pts: 3 },
        { skill: "Đọc hiểu", n: 8, pts: 2 },
        { skill: "Viết", n: 4, pts: 2 }
      ],
      matrix: { NB: 30, TH: 40, VD: 20, VDC: 10 } },

    { id: "hk2-ck", type: "KTCK", term: 2, name: "Cuối học kì II · Unit 7–12",
      minutes: 60, units: [7, 8, 9, 10, 11, 12], form: "Đề chung toàn khối",
      sections: [
        { skill: "Nghe", n: 10, pts: 2 },
        { skill: "Ngữ âm", n: 4, pts: 1 },
        { skill: "Từ vựng – Ngữ pháp", n: 14, pts: 3 },
        { skill: "Đọc hiểu", n: 10, pts: 2 },
        { skill: "Viết", n: 5, pts: 2 }
      ],
      matrix: { NB: 30, TH: 40, VD: 20, VDC: 10 } }
  ],

  imported: [],

  bySpec(id) { return this.specs.find(s => s.id === id) || null; },
  byTerm(term) { return this.specs.filter(s => s.term === term); },
  byType(type) { return this.specs.filter(s => s.type === type); },
  totalPoints(spec) { return spec.sections.reduce((a, s) => a + s.pts, 0); },
  totalQuestions(spec) { return spec.sections.reduce((a, s) => a + s.n, 0); },
  hasBank(specId) { return this.imported.some(x => x.specId === specId); }
};
