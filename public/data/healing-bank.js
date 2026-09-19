// Ngân hàng bài tập chữa lỗi ngữ pháp trọng tâm THCS (12 dạng lỗi) — dùng bởi Phòng Chữa Lỗi
window.ENGO_HEALING_BANK = {
      "PS_AFF": {
        label: "Hiện tại đơn — Khẳng định (+s/es)",
        rule: "Chủ ngữ ngôi thứ 3 số ít (he, she, it) thì động từ phải thêm -s hoặc -es.",
        mnemonic: "He/She/It thích thêm S. Động từ tận cùng o, s, z, x, ch, sh thì thêm ES.",
        category: "present-simple",
        questions: [
          { prompt: "My brother ________ TV every evening.", options: ["A. watch", "B. watches", "C. watching", "D. is watch"], answer: 1, explanation: "Chủ ngữ 'My brother' (số ít) nên động từ 'watch' phải thêm 'es'." },
          { prompt: "She ________ to school by bus.", options: ["A. goes", "B. go", "C. going", "D. is go"], answer: 0, explanation: "Chủ ngữ 'She' (số ít) nên động từ 'go' thêm 'es'." },
          { prompt: "Nam ________ English very well.", options: ["A. speak", "B. speaking", "C. speaks", "D. is speak"], answer: 2, explanation: "Chủ ngữ 'Nam' (số ít) nên động từ 'speak' thêm 's'." },
          { prompt: "It ________ a lot in summer.", options: ["A. rain", "B. raining", "C. rains", "D. is rain"], answer: 2, explanation: "Chủ ngữ 'It' (số ít) nên động từ 'rain' thêm 's'." },
          { prompt: "My father ________ coffee in the morning.", options: ["A. drink", "B. drinks", "C. drinking", "D. drank"], answer: 1, explanation: "Thói quen (in the morning) + Chủ ngữ số ít 'My father' -> 'drinks'." },
          { prompt: "The sun ________ in the east.", options: ["A. rise", "B. rising", "C. rises", "D. rose"], answer: 2, explanation: "Sự thật hiển nhiên + 'The sun' (số ít) -> 'rises'." },
          { prompt: "He often ________ his grandparents on Sundays.", options: ["A. visit", "B. visits", "C. visiting", "D. to visit"], answer: 1, explanation: "Chủ ngữ 'He' (số ít) -> 'visits'." },
          { prompt: "Mai ________ her teeth twice a day.", options: ["A. brush", "B. brushes", "C. brushing", "D. to brush"], answer: 1, explanation: "Chủ ngữ 'Mai' (số ít) và động từ tận cùng 'sh' -> 'brushes'." },
          { prompt: "The class ________ at 7 a.m.", options: ["A. start", "B. starting", "C. starts", "D. to start"], answer: 2, explanation: "Lịch trình + 'The class' (số ít) -> 'starts'." },
          { prompt: "My cat ________ mice.", options: ["A. catch", "B. catches", "C. catching", "D. to catch"], answer: 1, explanation: "Chủ ngữ 'My cat' (số ít) và động từ tận cùng 'ch' -> 'catches'." }
        ]
      },
      "PS_NEG": {
        label: "Hiện tại đơn — Phủ định (don't/doesn't)",
        rule: "Với chủ ngữ số nhiều/I/you, dùng don't. Với chủ ngữ số ít (he/she/it), dùng doesn't + V (nguyên thể).",
        mnemonic: "Số ít thì mượn 'doesn't', đã mượn rồi thì động từ KHÔNG chia nữa.",
        category: "present-simple",
        questions: [
          { prompt: "He ________ like playing football.", options: ["A. don't", "B. not", "C. doesn't", "D. isn't"], answer: 2, explanation: "Chủ ngữ 'He' (số ít) dùng trợ động từ 'doesn't'." },
          { prompt: "They ________ go to school on Sundays.", options: ["A. doesn't", "B. don't", "C. aren't", "D. not"], answer: 1, explanation: "Chủ ngữ 'They' (số nhiều) dùng trợ động từ 'don't'." },
          { prompt: "My mother ________ cook dinner every day.", options: ["A. don't", "B. not", "C. doesn't", "D. hasn't"], answer: 2, explanation: "Chủ ngữ 'My mother' (số ít) dùng 'doesn't'." },
          { prompt: "I ________ know the answer to this question.", options: ["A. doesn't", "B. don't", "C. am not", "D. not"], answer: 1, explanation: "Chủ ngữ 'I' dùng 'don't'." },
          { prompt: "She doesn't ________ any brothers or sisters.", options: ["A. has", "B. have", "C. having", "D. to have"], answer: 1, explanation: "Sau 'doesn't' động từ phải ở dạng nguyên thể là 'have'." },
          { prompt: "We ________ want to watch that movie.", options: ["A. doesn't", "B. not", "C. don't", "D. aren't"], answer: 2, explanation: "Chủ ngữ 'We' (số nhiều) dùng 'don't'." },
          { prompt: "The dog ________ bark at night.", options: ["A. don't", "B. doesn't", "C. isn't", "D. not"], answer: 1, explanation: "Chủ ngữ 'The dog' (số ít) dùng 'doesn't'." },
          { prompt: "Tom and Jerry ________ fight all the time.", options: ["A. doesn't", "B. don't", "C. aren't", "D. isn't"], answer: 1, explanation: "Chủ ngữ 'Tom and Jerry' (số nhiều) dùng 'don't'." },
          { prompt: "It ________ snow in Ho Chi Minh City.", options: ["A. doesn't", "B. don't", "C. isn't", "D. not"], answer: 0, explanation: "Chủ ngữ 'It' (số ít) dùng 'doesn't'." },
          { prompt: "My sister ________ read comic books.", options: ["A. don't", "B. doesn't", "C. isn't", "D. not"], answer: 1, explanation: "Chủ ngữ 'My sister' (số ít) dùng 'doesn't'." }
        ]
      },
      "PS_QUE": {
        label: "Hiện tại đơn — Nghi vấn (Do/Does)",
        rule: "Đảo Do/Does lên trước chủ ngữ. Do cho số nhiều, Does cho số ít. Động từ chính để nguyên thể.",
        mnemonic: "Hỏi Does thì mượn Does, động từ trả về nguyên gốc.",
        category: "present-simple",
        questions: [
          { prompt: "________ you like listening to music?", options: ["A. Does", "B. Do", "C. Are", "D. Is"], answer: 1, explanation: "Chủ ngữ 'you' dùng trợ động từ 'Do'." },
          { prompt: "________ she work in a hospital?", options: ["A. Do", "B. Does", "C. Is", "D. Are"], answer: 1, explanation: "Chủ ngữ 'she' (số ít) dùng trợ động từ 'Does'." },
          { prompt: "Does your father ________ a car?", options: ["A. drives", "B. drive", "C. driving", "D. to drive"], answer: 1, explanation: "Đã có 'Does' thì động từ phải ở dạng nguyên thể 'drive'." },
          { prompt: "________ they play tennis on weekends?", options: ["A. Does", "B. Are", "C. Do", "D. Have"], answer: 2, explanation: "Chủ ngữ 'they' (số nhiều) dùng 'Do'." },
          { prompt: "What time ________ the train leave?", options: ["A. do", "B. does", "C. is", "D. are"], answer: 1, explanation: "Chủ ngữ 'the train' (số ít) dùng 'does'." },
          { prompt: "________ Nam and Lan study in the same class?", options: ["A. Does", "B. Is", "C. Do", "D. Are"], answer: 2, explanation: "Chủ ngữ 'Nam and Lan' (số nhiều) dùng 'Do'." },
          { prompt: "How often ________ you go to the cinema?", options: ["A. does", "B. do", "C. are", "D. is"], answer: 1, explanation: "Chủ ngữ 'you' dùng 'do'." },
          { prompt: "Where ________ she live?", options: ["A. do", "B. does", "C. is", "D. are"], answer: 1, explanation: "Chủ ngữ 'she' (số ít) dùng 'does'." },
          { prompt: "Do you ________ any pets?", options: ["A. has", "B. have", "C. having", "D. to have"], answer: 1, explanation: "Đã có trợ động từ 'Do', động từ chính ở dạng nguyên thể 'have'." },
          { prompt: "Does it ________ a lot in your country?", options: ["A. rains", "B. rain", "C. raining", "D. to rain"], answer: 1, explanation: "Đã có 'Does' thì động từ chính nguyên thể 'rain'." }
        ]
      },
      "PS_ADV": {
        label: "Hiện tại đơn — Vị trí trạng từ tần suất",
        rule: "Trạng từ tần suất (always, usually, often...) đứng TRƯỚC động từ thường và SAU động từ to be (am/is/are).",
        mnemonic: "To be -> Trạng từ tần suất -> Động từ thường.",
        category: "present-simple",
        questions: [
          { prompt: "He ________ late for school.", options: ["A. always is", "B. is always", "C. always", "D. is"], answer: 1, explanation: "Trạng từ 'always' đứng sau động từ to be 'is'." },
          { prompt: "I ________ my homework in the evening.", options: ["A. usually do", "B. do usually", "C. usually doing", "D. am usually do"], answer: 0, explanation: "Trạng từ 'usually' đứng trước động từ thường 'do'." },
          { prompt: "She ________ goes to bed early.", options: ["A. never", "B. is never", "C. never is", "D. doesn't never"], answer: 0, explanation: "Trạng từ 'never' đứng trước động từ thường 'goes'." },
          { prompt: "They ________ very friendly.", options: ["A. often are", "B. are often", "C. often", "D. do often"], answer: 1, explanation: "Trạng từ 'often' đứng sau động từ to be 'are'." },
          { prompt: "We ________ watch TV after dinner.", options: ["A. sometimes", "B. are sometimes", "C. sometimes are", "D. sometimes do"], answer: 0, explanation: "Trạng từ 'sometimes' đứng trước động từ thường 'watch'." },
          { prompt: "The weather ________ cold in winter.", options: ["A. usually is", "B. is usually", "C. usually", "D. does usually"], answer: 1, explanation: "Trạng từ 'usually' đứng sau động từ to be 'is'." },
          { prompt: "Nam ________ plays video games.", options: ["A. rarely", "B. is rarely", "C. rarely is", "D. rarely does"], answer: 0, explanation: "Trạng từ 'rarely' đứng trước động từ thường 'plays'." },
          { prompt: "You ________ late!", options: ["A. always are", "B. are always", "C. always", "D. do always"], answer: 1, explanation: "Trạng từ 'always' đứng sau to be 'are'." },
          { prompt: "I ________ get up at 6 a.m.", options: ["A. always", "B. always am", "C. am always", "D. do always"], answer: 0, explanation: "Trạng từ 'always' đứng trước động từ thường 'get up'." },
          { prompt: "She ________ tired after work.", options: ["A. often is", "B. is often", "C. often", "D. does often"], answer: 1, explanation: "Trạng từ 'often' đứng sau to be 'is'." }
        ]
      },
      "PAST_REG": {
        label: "Quá khứ đơn — Động từ quy tắc (-ed)",
        rule: "Thêm -ed vào sau động từ quy tắc. Chú ý: gấp đôi phụ âm cuối nếu từ có 1 âm tiết, tận cùng là 1 nguyên âm kẹp giữa 2 phụ âm (stop -> stopped). Đổi y thành i rồi thêm -ed (study -> studied).",
        mnemonic: "Nhớ gấp đôi phụ âm khi cần (stop-stopped). Có 'y' dài biến thành 'i' ngắn (study-studied).",
        category: "past-simple",
        questions: [
          { prompt: "I ________ my grandparents last weekend.", options: ["A. visited", "B. visit", "C. visitted", "D. visiting"], answer: 0, explanation: "'visited' là quá khứ của 'visit', thêm 'ed' bình thường." },
          { prompt: "She ________ very hard for the exam.", options: ["A. studyed", "B. studied", "C. studies", "D. studying"], answer: 1, explanation: "Tận cùng 'y' sau một phụ âm, đổi 'y' thành 'i' và thêm 'ed' -> 'studied'." },
          { prompt: "The car ________ at the red light.", options: ["A. stoped", "B. stopped", "C. stops", "D. stopping"], answer: 1, explanation: "'stop' tận cùng là 1 phụ âm, trước là 1 nguyên âm -> gấp đôi phụ âm cuối 'stopped'." },
          { prompt: "They ________ a new house last year.", options: ["A. planned", "B. planed", "C. plans", "D. planning"], answer: 0, explanation: "'plan' gấp đôi phụ âm cuối thành 'planned'." },
          { prompt: "He ________ the match on TV.", options: ["A. watch", "B. watched", "C. watchhed", "D. watching"], answer: 1, explanation: "'watched' thêm 'ed' bình thường." },
          { prompt: "We ________ English when we were in London.", options: ["A. studyed", "B. studied", "C. studying", "D. studies"], answer: 1, explanation: "Quá khứ của 'study' là 'studied'." },
          { prompt: "The baby ________ all night.", options: ["A. cried", "B. cryed", "C. cries", "D. crying"], answer: 0, explanation: "'cry' tận cùng là 'y', đổi thành 'i' rồi thêm 'ed' -> 'cried'." },
          { prompt: "She ________ to go to the party.", options: ["A. wantted", "B. wanted", "C. want", "D. wanting"], answer: 1, explanation: "Thêm 'ed' bình thường thành 'wanted'." },
          { prompt: "I ________ to music yesterday.", options: ["A. listened", "B. listend", "C. listen", "D. listening"], answer: 0, explanation: "Quá khứ của 'listen' là 'listened'." },
          { prompt: "He ________ the heavy box easily.", options: ["A. droped", "B. dropped", "C. drop", "D. dropping"], answer: 1, explanation: "'drop' gấp đôi phụ âm cuối thành 'dropped'." }
        ]
      },
      "PAST_IRR": {
        label: "Quá khứ đơn — Động từ bất quy tắc (V2)",
        rule: "Động từ bất quy tắc không thêm -ed mà biến đổi dạng theo cột 2 trong bảng động từ bất quy tắc (go -> went, buy -> bought).",
        mnemonic: "Go đi thành went, Buy mua thành bought. Phải học thuộc V2 thui!",
        category: "past-simple",
        questions: [
          { prompt: "I ________ to the cinema yesterday.", options: ["A. goed", "B. went", "C. go", "D. gone"], answer: 1, explanation: "Quá khứ của 'go' là 'went'." },
          { prompt: "She ________ a new dress last week.", options: ["A. buyed", "B. bought", "C. buys", "D. buy"], answer: 1, explanation: "Quá khứ của 'buy' là 'bought'." },
          { prompt: "They ________ a delicious cake.", options: ["A. maked", "B. made", "C. makes", "D. make"], answer: 1, explanation: "Quá khứ của 'make' là 'made'." },
          { prompt: "He ________ a letter to his friend.", options: ["A. writed", "B. wrote", "C. write", "D. written"], answer: 1, explanation: "Quá khứ của 'write' là 'wrote'." },
          { prompt: "We ________ a great time at the party.", options: ["A. haved", "B. had", "C. has", "D. have"], answer: 1, explanation: "Quá khứ của 'have' là 'had'." },
          { prompt: "I ________ him at the supermarket.", options: ["A. seed", "B. saw", "C. seen", "D. see"], answer: 1, explanation: "Quá khứ của 'see' là 'saw'." },
          { prompt: "She ________ me a beautiful gift.", options: ["A. gived", "B. gave", "C. gives", "D. given"], answer: 1, explanation: "Quá khứ của 'give' là 'gave'." },
          { prompt: "They ________ the game.", options: ["A. winned", "B. won", "C. wins", "D. win"], answer: 1, explanation: "Quá khứ của 'win' là 'won'." },
          { prompt: "The boy ________ his bike yesterday.", options: ["A. rided", "B. rode", "C. ridden", "D. ride"], answer: 1, explanation: "Quá khứ của 'ride' là 'rode'." },
          { prompt: "I ________ a glass of milk this morning.", options: ["A. drinked", "B. drank", "C. drunk", "D. drink"], answer: 1, explanation: "Quá khứ của 'drink' là 'drank'." }
        ]
      },
      "PAST_NEG": {
        label: "Quá khứ đơn — Phủ định (didn't)",
        rule: "Câu phủ định quá khứ đơn: Chủ ngữ + didn't + V (nguyên thể). Đã mượn didn't thì không chia V quá khứ nữa.",
        mnemonic: "Đã mượn 'didn't' thì V phải trở về nguyên gốc (không thêm ed, không V2).",
        category: "past-simple",
        questions: [
          { prompt: "I ________ go to school yesterday.", options: ["A. don't", "B. didn't", "C. doesn't", "D. wasn't"], answer: 1, explanation: "Phủ định quá khứ dùng 'didn't'." },
          { prompt: "She didn't ________ the movie.", options: ["A. watched", "B. watch", "C. watching", "D. watches"], answer: 1, explanation: "Sau 'didn't' dùng động từ nguyên thể 'watch'." },
          { prompt: "They ________ play football last Sunday.", options: ["A. weren't", "B. didn't", "C. don't", "D. wasn't"], answer: 1, explanation: "Phủ định quá khứ với động từ thường dùng 'didn't'." },
          { prompt: "He didn't ________ his keys.", options: ["A. found", "B. find", "C. finding", "D. finds"], answer: 1, explanation: "Sau 'didn't' động từ trở về nguyên thể 'find'." },
          { prompt: "We didn't ________ any photos on holiday.", options: ["A. took", "B. take", "C. taking", "D. takes"], answer: 1, explanation: "Động từ 'take' phải ở dạng nguyên thể sau 'didn't'." },
          { prompt: "Mai didn't ________ the homework.", options: ["A. did", "B. do", "C. does", "D. doing"], answer: 1, explanation: "Sau 'didn't' dùng động từ nguyên thể 'do'." },
          { prompt: "It didn't ________ yesterday.", options: ["A. rained", "B. rain", "C. raining", "D. rains"], answer: 1, explanation: "Động từ 'rain' nguyên thể sau 'didn't'." },
          { prompt: "The students didn't ________ the teacher.", options: ["A. understood", "B. understand", "C. understanding", "D. understands"], answer: 1, explanation: "Dùng nguyên thể 'understand' sau 'didn't'." },
          { prompt: "I didn't ________ a bike when I was young.", options: ["A. rode", "B. ride", "C. riding", "D. ridden"], answer: 1, explanation: "Nguyên thể 'ride' đi sau 'didn't'." },
          { prompt: "She didn't ________ early this morning.", options: ["A. woke up", "B. wake up", "C. waking up", "D. woken up"], answer: 1, explanation: "Dùng nguyên thể 'wake up' sau 'didn't'." }
        ]
      },
      "PAST_QUE": {
        label: "Quá khứ đơn — Nghi vấn (Did)",
        rule: "Câu hỏi quá khứ đơn: Đảo Did lên đầu câu + Chủ ngữ + V (nguyên thể). Đã có Did thì V không chia.",
        mnemonic: "Câu hỏi có 'Did' đứng đầu, động từ cũng phải trả về nguyên gốc.",
        category: "past-simple",
        questions: [
          { prompt: "________ you visit Hanoi last year?", options: ["A. Do", "B. Does", "C. Did", "D. Were"], answer: 2, explanation: "Câu hỏi quá khứ với động từ thường mượn trợ động từ 'Did'." },
          { prompt: "Did she ________ a new car?", options: ["A. bought", "B. buy", "C. buys", "D. buying"], answer: 1, explanation: "Đã có 'Did' thì động từ phải nguyên thể 'buy'." },
          { prompt: "What ________ they do yesterday?", options: ["A. did", "B. do", "C. are", "D. were"], answer: 0, explanation: "Từ để hỏi 'What' + trợ động từ quá khứ 'did'." },
          { prompt: "Did he ________ to the party?", options: ["A. went", "B. go", "C. going", "D. goes"], answer: 1, explanation: "Sau 'Did he' là động từ nguyên thể 'go'." },
          { prompt: "Where did you ________ that shirt?", options: ["A. found", "B. find", "C. finding", "D. finds"], answer: 1, explanation: "Động từ nguyên thể 'find' theo sau trợ động từ 'did'." },
          { prompt: "________ it rain last night?", options: ["A. Was", "B. Did", "C. Does", "D. Is"], answer: 1, explanation: "Câu hỏi về động từ 'rain' trong quá khứ dùng 'Did'." },
          { prompt: "Did they ________ the match?", options: ["A. won", "B. win", "C. winning", "D. wins"], answer: 1, explanation: "Động từ nguyên thể 'win' đi sau 'Did'." },
          { prompt: "Why did you ________ early?", options: ["A. left", "B. leave", "C. leaving", "D. leaves"], answer: 1, explanation: "Nguyên thể 'leave' đi sau 'did'." },
          { prompt: "________ Nam play football yesterday?", options: ["A. Did", "B. Was", "C. Does", "D. Do"], answer: 0, explanation: "Câu hỏi ở quá khứ cho động từ thường 'play' dùng 'Did'." },
          { prompt: "Did you ________ the news?", options: ["A. heard", "B. hear", "C. hearing", "D. hears"], answer: 1, explanation: "Động từ nguyên thể 'hear' theo sau 'Did'." }
        ]
      },
      "PAST_BE": {
        label: "Quá khứ đơn — To be (Was/Were)",
        rule: "I/he/she/it (số ít) dùng 'was'. You/we/they (số nhiều) dùng 'were'.",
        mnemonic: "Số ít đi với 'was' (3 chữ). Số nhiều đi với 'were' (4 chữ).",
        category: "past-simple",
        questions: [
          { prompt: "I ________ at home yesterday.", options: ["A. was", "B. were", "C. am", "D. are"], answer: 0, explanation: "Chủ ngữ 'I' đi với 'was'." },
          { prompt: "They ________ happy with the results.", options: ["A. was", "B. were", "C. are", "D. is"], answer: 1, explanation: "Chủ ngữ 'They' (số nhiều) đi với 'were'." },
          { prompt: "The weather ________ terrible last week.", options: ["A. was", "B. were", "C. is", "D. are"], answer: 0, explanation: "Chủ ngữ 'The weather' (số ít) đi với 'was'." },
          { prompt: "________ you at the park on Sunday?", options: ["A. Was", "B. Were", "C. Are", "D. Did"], answer: 1, explanation: "Chủ ngữ 'you' đi với 'Were' trong câu hỏi quá khứ." },
          { prompt: "She ________ not in class yesterday.", options: ["A. was", "B. were", "C. is", "D. did"], answer: 0, explanation: "Chủ ngữ 'She' đi với 'was'." },
          { prompt: "My parents ________ in London last year.", options: ["A. was", "B. were", "C. are", "D. did"], answer: 1, explanation: "Chủ ngữ 'My parents' (số nhiều) đi với 'were'." },
          { prompt: "The cat ________ on the roof.", options: ["A. was", "B. were", "C. is", "D. did"], answer: 0, explanation: "Chủ ngữ 'The cat' (số ít) đi với 'was'." },
          { prompt: "________ he a doctor before?", options: ["A. Was", "B. Were", "C. Is", "D. Did"], answer: 0, explanation: "Chủ ngữ 'he' đi với 'Was' trong câu hỏi." },
          { prompt: "We ________ late for the train.", options: ["A. was", "B. were", "C. are", "D. did"], answer: 1, explanation: "Chủ ngữ 'We' đi với 'were'." },
          { prompt: "It ________ a great movie.", options: ["A. was", "B. were", "C. is", "D. did"], answer: 0, explanation: "Chủ ngữ 'It' đi với 'was'." }
        ]
      },
      "CMP_SHORT": {
        label: "So sánh hơn — Tính từ ngắn",
        rule: "Thêm -er vào sau tính từ ngắn (1 âm tiết, hoặc 2 âm tiết tận cùng -y). Cấu trúc: Adj-er + than.",
        mnemonic: "Tính từ ngắn thì mọc thêm đuôi 'er'. Nhớ thêm 'than'. (tall -> taller than).",
        category: "comparatives",
        questions: [
          { prompt: "My house is ________ than yours.", options: ["A. biger", "B. bigger", "C. more big", "D. big"], answer: 1, explanation: "'big' (1 âm tiết), gấp đôi phụ âm cuối thành 'bigger'." },
          { prompt: "She is ________ than her sister.", options: ["A. tall", "B. taller", "C. more tall", "D. talller"], answer: 1, explanation: "'tall' (ngắn) thêm 'er' thành 'taller'." },
          { prompt: "Today is ________ than yesterday.", options: ["A. hoter", "B. hotter", "C. more hot", "D. hot"], answer: 1, explanation: "'hot' gấp đôi phụ âm cuối 'hotter'." },
          { prompt: "Math is ________ than history for me.", options: ["A. easyer", "B. easier", "C. more easy", "D. easy"], answer: 1, explanation: "'easy' tận cùng 'y' đổi thành 'i' rồi thêm 'er' -> 'easier'." },
          { prompt: "A car is ________ than a bicycle.", options: ["A. fast", "B. faster", "C. more fast", "D. fastter"], answer: 1, explanation: "'fast' (ngắn) thêm 'er' thành 'faster'." },
          { prompt: "My dog is ________ than my cat.", options: ["A. heavyer", "B. heavier", "C. more heavy", "D. heavy"], answer: 1, explanation: "'heavy' -> 'heavier'." },
          { prompt: "He is ________ than I am.", options: ["A. old", "B. older", "C. more old", "D. oldder"], answer: 1, explanation: "'old' -> 'older'." },
          { prompt: "The river is ________ than the lake.", options: ["A. deep", "B. deeper", "C. more deep", "D. deepper"], answer: 1, explanation: "'deep' -> 'deeper'." },
          { prompt: "Summer is ________ than spring.", options: ["A. warm", "B. warmer", "C. more warm", "D. warmmer"], answer: 1, explanation: "'warm' -> 'warmer'." },
          { prompt: "This box is ________ than that one.", options: ["A. small", "B. smaller", "C. more small", "D. smalller"], answer: 1, explanation: "'small' -> 'smaller'." }
        ]
      },
      "CMP_LONG": {
        label: "So sánh hơn — Tính từ dài",
        rule: "Tính từ dài (2 âm tiết trở lên, không tận cùng -y) dùng 'more + adj + than'.",
        mnemonic: "Tính từ dài, không thêm đuôi mà thêm 'more' đứng trước. (beautiful -> more beautiful).",
        category: "comparatives",
        questions: [
          { prompt: "This dress is ________ than that one.", options: ["A. beautifuler", "B. more beautiful", "C. most beautiful", "D. beautiful"], answer: 1, explanation: "'beautiful' là tính từ dài, dùng 'more beautiful'." },
          { prompt: "My phone is ________ than his.", options: ["A. expensiver", "B. more expensive", "C. expensive", "D. most expensive"], answer: 1, explanation: "'expensive' (dài) -> 'more expensive'." },
          { prompt: "Reading is ________ than watching TV.", options: ["A. interestinger", "B. more interesting", "C. interesting", "D. most interesting"], answer: 1, explanation: "'interesting' (dài) -> 'more interesting'." },
          { prompt: "She is ________ than her brother.", options: ["A. carefuler", "B. more careful", "C. careful", "D. most careful"], answer: 1, explanation: "'careful' (dài) -> 'more careful'." },
          { prompt: "This problem is ________ than the last one.", options: ["A. difficulter", "B. more difficult", "C. difficult", "D. most difficult"], answer: 1, explanation: "'difficult' (dài) -> 'more difficult'." },
          { prompt: "Health is ________ than money.", options: ["A. importanter", "B. more important", "C. important", "D. most important"], answer: 1, explanation: "'important' (dài) -> 'more important'." },
          { prompt: "City life is ________ than country life.", options: ["A. excitinger", "B. more exciting", "C. exciting", "D. most exciting"], answer: 1, explanation: "'exciting' (dài) -> 'more exciting'." },
          { prompt: "A sofa is ________ than a chair.", options: ["A. comfortabler", "B. more comfortable", "C. comfortable", "D. most comfortable"], answer: 1, explanation: "'comfortable' (dài) -> 'more comfortable'." },
          { prompt: "He is ________ than other students.", options: ["A. intelligenter", "B. more intelligent", "C. intelligent", "D. most intelligent"], answer: 1, explanation: "'intelligent' (dài) -> 'more intelligent'." },
          { prompt: "This book is ________ than the movie.", options: ["A. popularer", "B. more popular", "C. popular", "D. most popular"], answer: 1, explanation: "'popular' (dài) -> 'more popular'." }
        ]
      },
      "CMP_IRR": {
        label: "So sánh hơn — Bất quy tắc",
        rule: "Một số tính từ có dạng so sánh bất quy tắc phải học thuộc: good -> better, bad -> worse, far -> farther/further.",
        mnemonic: "Good thành better, bad thành worse. Thuộc lòng là qua môn!",
        category: "comparatives",
        questions: [
          { prompt: "The weather today is ________ than yesterday.", options: ["A. gooder", "B. better", "C. more good", "D. good"], answer: 1, explanation: "So sánh hơn của 'good' là 'better'." },
          { prompt: "This movie is ________ than the one we saw last week.", options: ["A. badder", "B. worse", "C. more bad", "D. bad"], answer: 1, explanation: "So sánh hơn của 'bad' là 'worse'." },
          { prompt: "His house is ________ from the city center than mine.", options: ["A. farer", "B. farther", "C. more far", "D. far"], answer: 1, explanation: "So sánh hơn của 'far' là 'farther' hoặc 'further'." },
          { prompt: "She sings ________ than anyone else in the choir.", options: ["A. weller", "B. better", "C. more well", "D. well"], answer: 1, explanation: "Trạng từ 'well' có so sánh hơn là 'better'." },
          { prompt: "I feel ________ today than I did yesterday.", options: ["A. badder", "B. worse", "C. more bad", "D. bad"], answer: 1, explanation: "So sánh hơn của 'bad' là 'worse'." },
          { prompt: "My test results are ________ than my sister's.", options: ["A. better", "B. gooder", "C. more good", "D. well"], answer: 0, explanation: "So sánh hơn của 'good' là 'better'." },
          { prompt: "The traffic is ________ in the evening than in the morning.", options: ["A. worse", "B. badder", "C. more bad", "D. bad"], answer: 0, explanation: "So sánh hơn của 'bad' là 'worse'." },
          { prompt: "We need to go ________ into the forest.", options: ["A. further", "B. farer", "C. more far", "D. far"], answer: 0, explanation: "So sánh hơn của 'far' là 'further'." },
          { prompt: "This pizza tastes ________ than the other one.", options: ["A. gooder", "B. better", "C. more good", "D. best"], answer: 1, explanation: "So sánh hơn của 'good' là 'better'." },
          { prompt: "The situation got ________ before it got better.", options: ["A. worse", "B. badder", "C. more bad", "D. bad"], answer: 0, explanation: "So sánh hơn của 'bad' là 'worse'." }
        ]
      }
    };
