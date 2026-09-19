// Bộ bài luyện nói mặc định của hệ thống (dùng khi giáo viên chưa giao bài)
// Giai đoạn 1: câu đơn (dễ -> khó). Giai đoạn 2: hội thoại ngắn theo phong cách SGK.
window.ENGO_SPEAKING_SETS = [
  {
    id: "sys-1-basic",
    title: "Khởi động: Câu đơn cơ bản",
    stage: 1,
    system: true,
    items: [
      { text: "I like English.", ipa: "/aɪ laɪk ˈɪŋɡlɪʃ/", meaning: "Tôi thích tiếng Anh.", level: "easy", focus: "Âm /l/ và âm cuối /ʃ/" },
      { text: "My school is big.", ipa: "/maɪ skuːl ɪz bɪɡ/", meaning: "Trường của tôi rộng.", level: "easy", focus: "Âm cuối /ɡ/ trong big" },
      { text: "She walks to school.", ipa: "/ʃiː wɔːks tuː skuːl/", meaning: "Cô ấy đi bộ đến trường.", level: "easy", focus: "Đuôi -s của walks" },
      { text: "We play football on Sundays.", ipa: "/wiː pleɪ ˈfʊtbɔːl ɒn ˈsʌndeɪz/", meaning: "Chúng tôi chơi bóng đá vào Chủ nhật.", level: "medium", focus: "Đuôi -s trong Sundays" },
      { text: "He visited his grandparents yesterday.", ipa: "/hiː ˈvɪzɪtɪd hɪz ˈɡrænpeərənts ˈjestədeɪ/", meaning: "Hôm qua anh ấy đã thăm ông bà.", level: "medium", focus: "Đuôi -ed đọc là /ɪd/" },
      { text: "Do you play badminton with your friends on weekends?", ipa: "/duː juː pleɪ ˈbædmɪntən wɪð jɔː frendz ɒn ˈwiːkendz/", meaning: "Bạn có chơi cầu lông với bạn bè vào cuối tuần không?", level: "hard", focus: "Nối âm và ngữ điệu lên ở câu hỏi" }
    ]
  },
  {
    id: "sys-1-grammar",
    title: "Câu đơn: Thì hiện tại & quá khứ",
    stage: 1,
    system: true,
    items: [
      { text: "She usually walks to school every morning.", ipa: "/ʃi ˈjuːʒuəli wɔːks tu skuːl ˈɛvri ˈmɔːnɪŋ/", meaning: "Cô ấy thường đi bộ đến trường mỗi buổi sáng.", level: "easy", focus: "Đuôi -s ngôi thứ 3" },
      { text: "They visited Ha Long Bay last summer vacation.", ipa: "/ðeɪ ˈvɪzɪtɪd hɑː lɒŋ beɪ lɑːst ˈsʌmər vəˈkeɪʃən/", meaning: "Họ đã đi thăm vịnh Hạ Long vào kỳ nghỉ hè năm ngoái.", level: "medium", focus: "Đuôi -ed" },
      { text: "I bought a new English dictionary yesterday.", ipa: "/aɪ bɔːt ə njuː ˈɪŋɡlɪʃ ˈdɪkʃənəri ˈjɛstədeɪ/", meaning: "Hôm qua tôi đã mua một quyển từ điển tiếng Anh mới.", level: "medium", focus: "Trọng âm từ dictionary" },
      { text: "We are preparing for our English mid-term test right now.", ipa: "/wiː ɑːr prɪˈpeərɪŋ fɔːr ˈaʊər ˈɪŋɡlɪʃ mɪd-tɜːm tɛst raɪt naʊ/", meaning: "Chúng tôi đang chuẩn bị cho bài kiểm tra giữa kỳ tiếng Anh.", level: "hard", focus: "Đuôi -ing và cụm từ dài" },
      { text: "The local government is trying to reduce air pollution and traffic congestion.", ipa: "/ðə ˈləʊkl ˈɡʌvnmənt ɪz ˈtraɪɪŋ tuː rɪˈdjuːs eə pəˈluːʃn ænd ˈtræfɪk kənˈdʒɛstʃən/", meaning: "Chính quyền địa phương đang nỗ lực giảm ô nhiễm không khí và ùn tắc giao thông.", level: "hard", focus: "Từ nhiều âm tiết" }
    ]
  },
  {
    id: "sys-1-daily",
    title: "Câu đơn: Giao tiếp ở trường",
    stage: 1,
    system: true,
    items: [
      { text: "Good morning teacher, how was your weekend?", ipa: "/ɡʊd ˈmɔːnɪŋ ˈtiːtʃər haʊ wɒz jɔːr ˈwiːkˌɛnd/", meaning: "Chào buổi sáng thầy cô! Cuối tuần của thầy cô thế nào ạ?", level: "easy", focus: "Ngữ điệu câu hỏi" },
      { text: "Could you please explain this grammar rule again?", ipa: "/kʊd juː pliːz ɪkˈspleɪn ðɪs ˈɡræmər ruːl əˈɡɛn/", meaning: "Thầy cô có thể giải thích lại quy tắc ngữ pháp này giúp em được không ạ?", level: "medium", focus: "Âm /pl/ và /ɡr/" },
      { text: "In my opinion, learning English opens many great opportunities.", ipa: "/ɪn maɪ əˈpɪnjən ˈlɜːnɪŋ ˈɪŋɡlɪʃ ˈəʊpənz ˈmɛni ɡreɪt ˌɒpəˈtjuːnɪtiz/", meaning: "Theo tôi, học tiếng Anh mở ra nhiều cơ hội tuyệt vời.", level: "hard", focus: "Trọng âm opportunities" },
      { text: "Practice makes perfect, so never give up on your dreams.", ipa: "/ˈpræktɪs meɪks ˈpɜːfɪkt səʊ ˈnɛvər ɡɪv ʌp ɒn jɔːr driːmz/", meaning: "Có công mài sắt có ngày nên kim, đừng bao giờ từ bỏ ước mơ.", level: "hard", focus: "Đuôi -s trong makes và dreams" }
    ]
  },
  {
    id: "sys-2-craft",
    title: "Hội thoại: A visit to a craft village",
    stage: 2,
    system: true,
    situation: "Nam kể cho Mai nghe về chuyến đi làng gốm Bát Tràng.",
    items: [
      { speaker: "A", text: "Hi Mai, where did you go last weekend?", ipa: "/haɪ maɪ weə dɪd juː ɡəʊ lɑːst ˈwiːkend/", meaning: "Chào Mai, cuối tuần trước bạn đi đâu vậy?" },
      { speaker: "B", text: "I visited Bat Trang pottery village with my family.", ipa: "/aɪ ˈvɪzɪtɪd bɑːt trɑːŋ ˈpɒtəri ˈvɪlɪdʒ wɪð maɪ ˈfæməli/", meaning: "Mình đi thăm làng gốm Bát Tràng với gia đình." },
      { speaker: "A", text: "That sounds interesting. What did you do there?", ipa: "/ðæt saʊndz ˈɪntrəstɪŋ wɒt dɪd juː duː ðeə/", meaning: "Nghe thú vị đấy. Bạn đã làm gì ở đó?" },
      { speaker: "B", text: "We watched the artisans and made our own bowls.", ipa: "/wiː wɒtʃt ði ˈɑːtɪzænz ænd meɪd ˈaʊə əʊn bəʊlz/", meaning: "Bọn mình xem các nghệ nhân làm việc và tự nặn bát." },
      { speaker: "A", text: "Wow, I want to go there next month!", ipa: "/waʊ aɪ wɒnt tuː ɡəʊ ðeə nekst mʌnθ/", meaning: "Ồ, tháng sau mình cũng muốn đi!" }
    ]
  },
  {
    id: "sys-2-city",
    title: "Hội thoại: Living in the city",
    stage: 2,
    system: true,
    situation: "Hai bạn trao đổi về ưu và nhược điểm của cuộc sống thành phố.",
    items: [
      { speaker: "A", text: "Do you like living in a big city, Linh?", ipa: "/duː juː laɪk ˈlɪvɪŋ ɪn ə bɪɡ ˈsɪti lɪn/", meaning: "Linh có thích sống ở thành phố lớn không?" },
      { speaker: "B", text: "Yes, it is convenient, but the traffic is terrible.", ipa: "/jes ɪt ɪz kənˈviːniənt bʌt ðə ˈtræfɪk ɪz ˈterəbl/", meaning: "Có, rất tiện lợi, nhưng giao thông thì tệ lắm." },
      { speaker: "A", text: "How do you get to school every day?", ipa: "/haʊ duː juː ɡet tuː skuːl ˈevri deɪ/", meaning: "Hằng ngày bạn đến trường bằng gì?" },
      { speaker: "B", text: "I usually take the bus because it is cheap and safe.", ipa: "/aɪ ˈjuːʒuəli teɪk ðə bʌs bɪˈkɒz ɪt ɪz tʃiːp ænd seɪf/", meaning: "Mình thường đi xe buýt vì rẻ và an toàn." },
      { speaker: "A", text: "That is a good idea. Maybe I should try it too.", ipa: "/ðæt ɪz ə ɡʊd aɪˈdɪə ˈmeɪbi aɪ ʃʊd traɪ ɪt tuː/", meaning: "Ý hay đấy. Có lẽ mình cũng nên thử." }
    ]
  }
];
