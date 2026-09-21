// Ngữ pháp Tiếng Anh 9 — Global Success, Unit 1–12
// Mỗi unit gồm: trọng tâm ngữ pháp, công thức, ví dụ, mã lỗi riêng và câu luyện tập.
// Mã lỗi ở đây nối tiếp 12 mã lỗi nền (PS_*, PAST_*, CMP_*) trong services/speaking-scorer.js
// và được Phòng Chữa Lỗi dùng để gom lỗi, vẽ bản đồ nhiệt theo unit.
window.ENGO_GRAMMAR_UNITS = {
  unit1: {
    unit: 1,
    name: "Unit 1 · Local Community",
    focus: "Từ để hỏi + to-infinitive · Cụm động từ (phrasal verbs)",
    points: [
      {
        title: "Wh-word + to-infinitive",
        rule: "Dùng what / where / when / how / who + to V để rút gọn một mệnh đề hỏi gián tiếp. Chủ ngữ của hai vế phải cùng là một người.",
        form: "S + V + wh-word + to V",
        ok: "I don't know where to buy local handicrafts.",
        no: "I don't know where I should to buy local handicrafts.",
        note: "Sau wh-word là động từ nguyên thể có to, không chia thì."
      },
      {
        title: "Phrasal verbs — tách được và không tách được",
        rule: "Cụm động từ gồm động từ + tiểu từ. Loại tách được cho phép đặt tân ngữ ở giữa; nếu tân ngữ là đại từ thì bắt buộc đặt ở giữa.",
        form: "take the rubbish away = take away the rubbish = take it away",
        ok: "Please take it away before noon.",
        no: "Please take away it before noon.",
        note: "Loại không tách được (get on with, look for) luôn giữ nguyên cụm."
      }
    ],
    codes: [
      { id: "U1_WHTO", label: "Wh-word + to V", hint: "Sau từ để hỏi phải là động từ nguyên thể có to, không chia thì." },
      { id: "U1_PHRV", label: "Vị trí tân ngữ trong phrasal verb", hint: "Tân ngữ là đại từ (it, them) phải nằm giữa động từ và tiểu từ." }
    ],
    quiz: [
      { q: "She is wondering ______ for the community garden project.", a: "where to find volunteers", b: ["where finding volunteers", "where she find volunteers"], code: "U1_WHTO" },
      { q: "The rubbish is heavy. Can you take ______ away?", a: "it", b: ["away it", "it away away"], code: "U1_PHRV" },
      { q: "Please tell me ______ about the community centre.", a: "who to contact", b: ["who contacting", "who to contacting"], code: "U1_WHTO" }
    ]
  },
  unit2: {
    unit: 2,
    name: "Unit 2 · City Life",
    focus: "So sánh kép (double comparatives) · Cụm động từ (tiếp)",
    points: [
      {
        title: "So sánh kép — càng… càng…",
        rule: "Diễn tả hai sự việc tăng hoặc giảm song song.",
        form: "The + so sánh hơn + S + V, the + so sánh hơn + S + V",
        ok: "The more crowded the city is, the harder it is to find affordable housing.",
        no: "The more crowded the city is, the hard it is to find housing.",
        note: "Cả hai vế đều phải ở dạng so sánh hơn."
      },
      {
        title: "So sánh hơn tăng dần — ngày càng…",
        rule: "Lặp lại tính từ so sánh hơn, nối bằng and.",
        form: "S + be/get + so sánh hơn + and + so sánh hơn",
        ok: "Traffic jams are getting worse and worse.",
        no: "Traffic jams are getting more worse and worse.",
        note: "Tính từ dài dùng more and more + adj: more and more convenient."
      }
    ],
    codes: [
      { id: "U2_DBLCMP", label: "So sánh kép", hint: "Cả hai vế của cấu trúc the… the… đều phải là dạng so sánh hơn." },
      { id: "U2_INCCMP", label: "So sánh tăng dần", hint: "Tính từ ngắn dùng -er and -er; tính từ dài dùng more and more + adj." }
    ],
    quiz: [
      { q: "The more skyscrapers a city has, ______ it looks at night.", a: "the more modern", b: ["the modern", "more modern"], code: "U2_DBLCMP" },
      { q: "Public transport is becoming ______.", a: "more and more convenient", b: ["convenienter and convenienter", "more convenient and convenient"], code: "U2_INCCMP" },
      { q: "______ we leave, the less traffic we meet.", a: "The earlier", b: ["The early", "Earlier"], code: "U2_DBLCMP" }
    ]
  },
  unit3: {
    unit: 3,
    name: "Unit 3 · Healthy Living for Teens",
    focus: "Động từ khuyết thiếu trong câu điều kiện loại 1",
    points: [
      {
        title: "Câu điều kiện loại 1 có modal verb",
        rule: "Nói về điều có thật ở hiện tại hoặc tương lai. Vế if dùng hiện tại đơn, vế chính dùng will / can / should / must / may.",
        form: "If + S + V(hiện tại đơn), S + will/can/should/must + V",
        ok: "If you skip breakfast, you may feel tired at school.",
        no: "If you will skip breakfast, you may feel tired.",
        note: "Không dùng will ở vế if."
      },
      {
        title: "should / must / have to trong lời khuyên sức khoẻ",
        rule: "should đưa lời khuyên, must là bắt buộc do người nói, have to là bắt buộc do hoàn cảnh bên ngoài.",
        form: "S + should / must / have to + V",
        ok: "Teenagers should sleep at least eight hours a night.",
        no: "Teenagers should to sleep at least eight hours.",
        note: "Sau modal verb luôn là động từ nguyên thể không to."
      }
    ],
    codes: [
      { id: "U3_COND1", label: "Điều kiện loại 1", hint: "Vế if dùng hiện tại đơn, không dùng will." },
      { id: "U3_MODAL", label: "Modal + V nguyên thể", hint: "Sau should / must / can không có to." }
    ],
    quiz: [
      { q: "If you ______ enough water, your skin will look better.", a: "drink", b: ["will drink", "drinks"], code: "U3_COND1" },
      { q: "You should ______ more vegetables.", a: "eat", b: ["to eat", "eating"], code: "U3_MODAL" },
      { q: "If she practises every day, she ______ her stress.", a: "can reduce", b: ["can reduces", "can to reduce"], code: "U3_MODAL" }
    ]
  },
  unit4: {
    unit: 4,
    name: "Unit 4 · Remembering the Past",
    focus: "Quá khứ tiếp diễn · Wish + quá khứ đơn",
    points: [
      {
        title: "Quá khứ tiếp diễn",
        rule: "Diễn tả hành động đang xảy ra tại một thời điểm trong quá khứ, hoặc hành động dài bị hành động ngắn cắt ngang.",
        form: "S + was/were + V-ing (+ when + S + V quá khứ đơn)",
        ok: "My grandmother was making sticky rice when we arrived.",
        no: "My grandmother made sticky rice when we were arriving.",
        note: "Hành động dài dùng tiếp diễn, hành động cắt ngang dùng quá khứ đơn."
      },
      {
        title: "Wish + quá khứ đơn",
        rule: "Diễn tả điều ước trái với thực tế ở hiện tại.",
        form: "S + wish(es) + S + V quá khứ đơn (be luôn dùng were)",
        ok: "I wish I were living in that old village again.",
        no: "I wish I am living in that old village again.",
        note: "Với động từ to be, mọi ngôi đều dùng were trong câu ước."
      }
    ],
    codes: [
      { id: "U4_PASTCONT", label: "Quá khứ tiếp diễn", hint: "was/were + V-ing cho hành động đang diễn ra trong quá khứ." },
      { id: "U4_WISH", label: "Wish + quá khứ đơn", hint: "Sau wish dùng thì quá khứ đơn; to be luôn là were." }
    ],
    quiz: [
      { q: "We ______ old photos when the lights went out.", a: "were looking at", b: ["looked at", "are looking at"], code: "U4_PASTCONT" },
      { q: "I wish my village ______ its traditional market.", a: "still had", b: ["still has", "still have"], code: "U4_WISH" },
      { q: "She wishes she ______ old enough to join the festival.", a: "were", b: ["was being", "is"], code: "U4_WISH" }
    ]
  },
  unit5: {
    unit: 5,
    name: "Unit 5 · Our Experiences",
    focus: "Thì hiện tại hoàn thành",
    points: [
      {
        title: "Hiện tại hoàn thành",
        rule: "Diễn tả trải nghiệm tính tới hiện tại, hoặc hành động bắt đầu trong quá khứ và còn kéo dài.",
        form: "S + have/has + V3/V-ed",
        ok: "I have taken an eco-tour twice.",
        no: "I have took an eco-tour twice.",
        note: "Sau have/has phải là quá khứ phân từ (cột 3), không phải quá khứ đơn."
      },
      {
        title: "for / since / ever / never / already / yet",
        rule: "for + khoảng thời gian, since + mốc thời gian. yet đứng cuối câu phủ định và câu hỏi.",
        form: "S + have/has + (never/already) + V3 … for/since …",
        ok: "She has lived here since 2020.",
        no: "She has lived here since three years.",
        note: "since đi với mốc (2020, last year), for đi với khoảng (three years)."
      }
    ],
    codes: [
      { id: "U5_PRESPERF", label: "Hiện tại hoàn thành", hint: "have/has + quá khứ phân từ, không dùng quá khứ đơn." },
      { id: "U5_FORSINCE", label: "for / since", hint: "for + khoảng thời gian; since + mốc thời gian." }
    ],
    quiz: [
      { q: "They ______ that cave before.", a: "have never explored", b: ["have never explore", "has never explored"], code: "U5_PRESPERF" },
      { q: "We have known each other ______ five years.", a: "for", b: ["since", "from"], code: "U5_FORSINCE" },
      { q: "Have you ______ your homework yet?", a: "done", b: ["did", "do"], code: "U5_PRESPERF" }
    ]
  },
  unit6: {
    unit: 6,
    name: "Unit 6 · Vietnamese Lifestyles: Then and Now",
    focus: "Verb + to-infinitive · Verb + V-ing",
    points: [
      {
        title: "Động từ theo sau là to V",
        rule: "Nhóm want, hope, decide, plan, agree, promise, expect, learn, would like luôn đi với to V.",
        form: "S + V + to V",
        ok: "They decided to preserve the old house.",
        no: "They decided preserving the old house.",
        note: "Ghi nhớ theo nhóm, không dịch từng chữ từ tiếng Việt."
      },
      {
        title: "Động từ theo sau là V-ing",
        rule: "Nhóm enjoy, avoid, finish, practise, suggest, mind, keep, consider luôn đi với V-ing.",
        form: "S + V + V-ing",
        ok: "My grandparents enjoy telling stories about the past.",
        no: "My grandparents enjoy to tell stories about the past.",
        note: "like / love / start / begin dùng được cả hai dạng, nghĩa gần như nhau."
      }
    ],
    codes: [
      { id: "U6_VTOINF", label: "V + to V", hint: "want / decide / hope / plan đi với to + động từ nguyên thể." },
      { id: "U6_VING", label: "V + V-ing", hint: "enjoy / avoid / finish / practise đi với động từ thêm -ing." }
    ],
    quiz: [
      { q: "She avoids ______ fast food after school.", a: "eating", b: ["to eat", "eat"], code: "U6_VING" },
      { q: "We hope ______ the craft village next month.", a: "to visit", b: ["visiting", "visit"], code: "U6_VTOINF" },
      { q: "He keeps ______ the same traditional song.", a: "singing", b: ["to sing", "sing"], code: "U6_VING" }
    ]
  },
  unit7: {
    unit: 7,
    name: "Unit 7 · Natural Wonders of the World",
    focus: "Câu tường thuật — câu hỏi Yes/No",
    points: [
      {
        title: "Tường thuật câu hỏi Yes/No",
        rule: "Dùng asked / wanted to know + if / whether, sau đó đưa về dạng câu kể (chủ ngữ trước động từ) và lùi một thì.",
        form: "S + asked + (O) + if/whether + S + V(lùi thì)",
        ok: 'He asked me if I had ever seen Ha Long Bay.',
        no: 'He asked me if had I ever seen Ha Long Bay.',
        note: "Sau if/whether không đảo ngữ và không có dấu chấm hỏi."
      },
      {
        title: "Lùi thì và đổi trạng từ",
        rule: "Hiện tại đơn → quá khứ đơn; quá khứ đơn → quá khứ hoàn thành. today → that day, tomorrow → the next day, here → there.",
        form: "“Do you like it?” → She asked if I liked it.",
        ok: "She asked whether we were going there the next day.",
        no: "She asked whether we are going here tomorrow.",
        note: "Đại từ cũng phải đổi theo người nói."
      }
    ],
    codes: [
      { id: "U7_REPYN", label: "Tường thuật câu hỏi Yes/No", hint: "Dùng if/whether và giữ trật tự câu kể, không đảo ngữ." },
      { id: "U7_REPTENSE", label: "Lùi thì khi tường thuật", hint: "Động từ phải lùi một thì so với câu gốc." }
    ],
    quiz: [
      { q: '“Are you tired?” → She asked me ______.', a: "if I was tired", b: ["if was I tired", "if I am tired"], code: "U7_REPYN" },
      { q: '“Did you climb the mountain?” → He asked whether I ______ the mountain.', a: "had climbed", b: ["climbed", "have climbed"], code: "U7_REPTENSE" },
      { q: '“Will it rain today?” → They wanted to know if it ______ that day.', a: "would rain", b: ["will rain", "rains"], code: "U7_REPTENSE" }
    ]
  },
  unit8: {
    unit: 8,
    name: "Unit 8 · Tourism",
    focus: "Đại từ quan hệ who / whom / whose / which / that",
    points: [
      {
        title: "Chọn đúng đại từ quan hệ",
        rule: "who thay cho người làm chủ ngữ, whom thay cho người làm tân ngữ, which thay cho vật, whose chỉ sở hữu, that thay được cho who và which trong mệnh đề xác định.",
        form: "N (người) + who/whom + … | N (vật) + which + …",
        ok: "The guide who showed us the cave was very friendly.",
        no: "The guide which showed us the cave was very friendly.",
        note: "whose luôn đi kèm một danh từ ngay sau nó."
      },
      {
        title: "Không lặp lại chủ ngữ",
        rule: "Sau đại từ quan hệ không được lặp lại đại từ chỉ danh từ đứng trước.",
        form: "The hotel which we booked … (không phải: which we booked it)",
        ok: "This is the beach which we visited last summer.",
        no: "This is the beach which we visited it last summer.",
        note: "Đây là lỗi rất phổ biến do dịch theo tiếng Việt."
      }
    ],
    codes: [
      { id: "U8_RELPRON", label: "Chọn đại từ quan hệ", hint: "who cho người, which cho vật, whose cho sở hữu." },
      { id: "U8_RELDUP", label: "Lặp tân ngữ sau đại từ quan hệ", hint: "Không dùng lại it / him / them sau which / who." }
    ],
    quiz: [
      { q: "That is the traveller ______ lost his passport.", a: "who", b: ["which", "whose"], code: "U8_RELPRON" },
      { q: "The resort ______ we stayed at was affordable.", a: "which", b: ["who", "whom"], code: "U8_RELPRON" },
      { q: "This is the souvenir which I bought ______ in Hoi An.", a: "(không cần gì)", b: ["it", "them"], code: "U8_RELDUP" }
    ]
  },
  unit9: {
    unit: 9,
    name: "Unit 9 · World Englishes",
    focus: "Mệnh đề quan hệ xác định",
    points: [
      {
        title: "Mệnh đề quan hệ xác định",
        rule: "Bổ nghĩa bắt buộc cho danh từ đứng trước, không dùng dấu phẩy. Bỏ đi thì câu mất nghĩa xác định.",
        form: "N + who/which/that + V …",
        ok: "Students who learn English online often improve quickly.",
        no: "Students, who learn English online, often improve quickly.",
        note: "Trong mệnh đề xác định có thể dùng that thay cho who/which."
      },
      {
        title: "Lược bỏ đại từ quan hệ",
        rule: "Khi đại từ quan hệ làm tân ngữ trong mệnh đề xác định thì có thể lược bỏ.",
        form: "The accent (which) she uses is British.",
        ok: "The variety of English I study is American English.",
        no: "The variety of English which it I study is American English.",
        note: "Không lược bỏ khi đại từ quan hệ làm chủ ngữ."
      }
    ],
    codes: [
      { id: "U9_DEFREL", label: "Mệnh đề quan hệ xác định", hint: "Không dùng dấu phẩy trước mệnh đề xác định." },
      { id: "U9_RELOMIT", label: "Lược bỏ đại từ quan hệ", hint: "Chỉ lược bỏ được khi đại từ quan hệ làm tân ngữ." }
    ],
    quiz: [
      { q: "The teacher ______ taught us pronunciation is from Singapore.", a: "who", b: [", who", "whom"], code: "U9_DEFREL" },
      { q: "The English ______ in India has its own accent.", a: "spoken", b: ["which speaks", "who spoken"], code: "U9_DEFREL" },
      { q: "The word ______ you asked about is informal.", a: "(có thể bỏ which)", b: ["which it", "who"], code: "U9_RELOMIT" }
    ]
  },
  unit10: {
    unit: 10,
    name: "Unit 10 · Planet Earth",
    focus: "Mệnh đề quan hệ không xác định",
    points: [
      {
        title: "Mệnh đề quan hệ không xác định",
        rule: "Bổ sung thông tin thêm cho một danh từ đã xác định. Luôn tách bằng dấu phẩy và không dùng that.",
        form: "N (đã xác định), who/which + V …",
        ok: "The Amazon, which produces much of our oxygen, is shrinking.",
        no: "The Amazon, that produces much of our oxygen, is shrinking.",
        note: "Danh từ riêng, hoặc danh từ có this/my, thường đi với mệnh đề không xác định."
      },
      {
        title: "which thay cho cả mệnh đề",
        rule: "which có thể thay cho toàn bộ ý vừa nói ở trước.",
        form: "…, which + V …",
        ok: "Sea levels are rising, which worries many scientists.",
        no: "Sea levels are rising, what worries many scientists.",
        note: "Không dùng what trong trường hợp này."
      }
    ],
    codes: [
      { id: "U10_NONDEF", label: "Mệnh đề quan hệ không xác định", hint: "Có dấu phẩy và không được dùng that." },
      { id: "U10_WHICHCL", label: "which thay cho cả mệnh đề", hint: "Dùng which, không dùng what, để thay cho ý đứng trước." }
    ],
    quiz: [
      { q: "Mount Everest, ______ is 8,849 m high, attracts many climbers.", a: "which", b: ["that", "what"], code: "U10_NONDEF" },
      { q: "The ice caps are melting, ______ raises sea levels.", a: "which", b: ["what", "that"], code: "U10_WHICHCL" },
      { q: "My father, ______ works for a climate group, often plants trees.", a: "who", b: ["that", "which"], code: "U10_NONDEF" }
    ]
  },
  unit11: {
    unit: 11,
    name: "Unit 11 · Electronic Devices",
    focus: "suggest / advise / recommend",
    points: [
      {
        title: "suggest / recommend + V-ing hoặc + that + S + should + V",
        rule: "suggest và recommend không đi trực tiếp với to V.",
        form: "S + suggest/recommend + V-ing | + that + S + (should) + V",
        ok: "I suggest turning off the device at night.",
        no: "I suggest to turn off the device at night.",
        note: "Cũng đúng: I suggest that you should turn off the device."
      },
      {
        title: "advise + tân ngữ + to V",
        rule: "advise có hai dạng: advise + V-ing (nói chung) và advise + O + to V (khuyên một người cụ thể).",
        form: "S + advise + O + to V",
        ok: "She advised me to back up my files.",
        no: "She advised me backing up my files.",
        note: "Phân biệt rõ: suggest không dùng được mẫu suggest + O + to V."
      }
    ],
    codes: [
      { id: "U11_SUGGEST", label: "suggest / recommend", hint: "Đi với V-ing hoặc that + S + should + V, không dùng to V." },
      { id: "U11_ADVISE", label: "advise + O + to V", hint: "Khi có tân ngữ chỉ người thì advise đi với to V." }
    ],
    quiz: [
      { q: "He suggested ______ a new laptop.", a: "buying", b: ["to buy", "buy"], code: "U11_SUGGEST" },
      { q: "The teacher advised us ______ our passwords.", a: "to change", b: ["changing", "change"], code: "U11_ADVISE" },
      { q: "I recommend that she ______ the app first.", a: "should try", b: ["to try", "trying"], code: "U11_SUGGEST" }
    ]
  },
  unit12: {
    unit: 12,
    name: "Unit 12 · Career Choices",
    focus: "Mệnh đề trạng ngữ: nhượng bộ · kết quả · lí do",
    points: [
      {
        title: "Nhượng bộ — although / though / even though / despite / in spite of",
        rule: "although + mệnh đề; despite / in spite of + danh từ hoặc V-ing.",
        form: "Although + S + V, S + V. | Despite + N/V-ing, S + V.",
        ok: "Despite working hard, he did not get the job.",
        no: "Despite he worked hard, he did not get the job.",
        note: "Sau despite / in spite of không được có mệnh đề đầy đủ."
      },
      {
        title: "Kết quả — so / such … that · Lí do — because / since / due to",
        rule: "so + tính từ/trạng từ + that; such + (a/an) + tính từ + danh từ + that. because + mệnh đề; due to + danh từ.",
        form: "S + be + so + adj + that + S + V | due to + N",
        ok: "The training was so demanding that many students quit.",
        no: "The training was so demanding job that many students quit.",
        note: "Có danh từ thì phải dùng such, không dùng so."
      }
    ],
    codes: [
      { id: "U12_CONCESS", label: "although / despite", hint: "although + mệnh đề; despite + danh từ hoặc V-ing." },
      { id: "U12_SOSUCH", label: "so / such … that", hint: "so + tính từ; such + (a/an) + tính từ + danh từ." },
      { id: "U12_REASON", label: "because / due to", hint: "because + mệnh đề; due to + danh từ." }
    ],
    quiz: [
      { q: "______ his low salary, he loves his job.", a: "Despite", b: ["Although", "Because"], code: "U12_CONCESS" },
      { q: "It was ______ an interesting career that she changed her plan.", a: "such", b: ["so", "very"], code: "U12_SOSUCH" },
      { q: "The factory closed ______ a lack of orders.", a: "due to", b: ["because", "although"], code: "U12_REASON" }
    ]
  }
};

// Tổng: 12 unit · 24 điểm ngữ pháp · 25 mã lỗi theo unit · 36 câu luyện tập.
// Cộng với 12 mã lỗi nền trong speaking-scorer.js, Phòng Chữa Lỗi nhận ra 37 dạng lỗi.
