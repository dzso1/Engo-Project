// Luyện nghe theo Unit 1–12 — Tiếng Anh 9 Global Success (Unit 1–12)
// Mỗi unit có 3 cấp độ nghe tăng dần, mỗi cấp gồm một đoạn nghe và 3 bài tập áp dụng.
//   L1 (dễ)  ~35–45 từ, tốc độ chậm  — nghe lấy thông tin chính
//   L2 (vừa) ~55–70 từ, tốc độ bình thường — nghe lấy chi tiết
//   L3 (khó) ~80–95 từ, tốc độ tự nhiên — nghe suy luận
// Âm thanh phát bằng Web Speech API (SpeechSynthesis) nên không cần tệp mp3;
// trường rate điều chỉnh tốc độ đọc, học sinh được nghe lại tối đa 3 lần mỗi cấp.
// Dạng bài tập: mcq (chọn đáp án), tf (đúng/sai), gap (điền từ nghe được).
window.ENGO_LISTENING_UNITS = {
  unit1: {
    unit: 1, name: "Unit 1 · Local Community",
    tasks: [
      { level: 1, rate: 0.82, title: "Giới thiệu về làng nghề",
        script: "Hello. I live in a small craft village near Ha Noi. My neighbours make pottery and bamboo beds. Every Sunday, tourists come here to buy handicrafts and take photos.",
        qs: [
          { type: "mcq", q: "Where does the speaker live?", opts: ["In a craft village", "In a big city", "On a farm"], a: 0 },
          { type: "tf", q: "Tourists come on Sundays.", a: true },
          { type: "gap", q: "My neighbours make pottery and bamboo ______.", a: "beds" }
        ]},
      { level: 2, rate: 0.95, title: "Hỏi đường trong khu phố",
        script: "Excuse me, I'm new here. I don't know where to find a post office. — Go straight, then turn left at the shopping mall. It's next to the bus station. — Thank you. And do you know who to contact about the community centre? — Yes, ask Mr Nam. He lives opposite the pedestrian street.",
        qs: [
          { type: "mcq", q: "What is the woman looking for?", opts: ["A post office", "A shopping mall", "A bus station"], a: 0 },
          { type: "mcq", q: "Where is the post office?", opts: ["Next to the bus station", "Inside the mall", "On the pedestrian street"], a: 0 },
          { type: "gap", q: "Ask Mr Nam. He lives ______ the pedestrian street.", a: "opposite" }
        ]},
      { level: 3, rate: 1.0, title: "Nghề thủ công đang mai một",
        script: "Lantern making has been part of our community for over two hundred years. My grandfather learnt it from his father, and he passed the skill down to me. But things are changing. Young people move to the suburbs to look for better-paid jobs, and only eight families still make lanterns by hand. We have started teaching short courses at weekends, because if the young do not learn now, the craft will disappear.",
        qs: [
          { type: "mcq", q: "Why are fewer families making lanterns?", opts: ["Young people move away for better jobs", "Tourists do not buy lanterns", "The materials are too expensive"], a: 0 },
          { type: "tf", q: "The speaker learnt the craft from his grandfather.", a: true },
          { type: "gap", q: "Only ______ families still make lanterns by hand.", a: "eight" }
        ]}
    ]
  },
  unit2: {
    unit: 2, name: "Unit 2 · City Life",
    tasks: [
      { level: 1, rate: 0.82, title: "Một ngày ở thành phố",
        script: "I live in Ho Chi Minh City. It is crowded but very convenient. I go to school by bus. There are many parks, cinemas and shopping malls near my house.",
        qs: [
          { type: "mcq", q: "How does the speaker go to school?", opts: ["By bus", "By bike", "On foot"], a: 0 },
          { type: "tf", q: "The city is quiet and empty.", a: false },
          { type: "gap", q: "It is crowded but very ______.", a: "convenient" }
        ]},
      { level: 2, rate: 0.95, title: "Kẹt xe giờ cao điểm",
        script: "Why were you late this morning? — There was a terrible traffic jam on Nguyen Hue Street. The more cars there are, the slower the buses move. — Why don't you take the metro? — I'd love to, but the nearest station is three kilometres from my house.",
        qs: [
          { type: "mcq", q: "Why was the man late?", opts: ["A traffic jam", "He woke up late", "The metro was closed"], a: 0 },
          { type: "mcq", q: "Why doesn't he take the metro?", opts: ["The station is far away", "It is too expensive", "It is always crowded"], a: 0 },
          { type: "gap", q: "The more cars there are, the ______ the buses move.", a: "slower" }
        ]},
      { level: 3, rate: 1.0, title: "Thành phố đáng sống",
        script: "A good city is not simply a city with tall skyscrapers. Researchers say the most liveable cities share three things: affordable housing, clean air and reliable public transport. In many Asian cities, housing prices are getting higher and higher, so young workers have to commute for more than an hour every day. Experts argue that building metro lines is cheaper in the long run than widening roads, because wider roads soon fill up with more cars.",
        qs: [
          { type: "mcq", q: "What do the most liveable cities share?", opts: ["Affordable housing, clean air, good transport", "Skyscrapers, malls and parks", "Low taxes and big roads"], a: 0 },
          { type: "tf", q: "Experts think widening roads solves traffic permanently.", a: false },
          { type: "gap", q: "Housing prices are getting higher and ______.", a: "higher" }
        ]}
    ]
  },
  unit3: {
    unit: 3, name: "Unit 3 · Healthy Living for Teens",
    tasks: [
      { level: 1, rate: 0.82, title: "Thói quen buổi sáng",
        script: "I always get up at six o'clock. I drink a glass of water and do some exercise. Then I have breakfast with my family. I never skip breakfast because I feel tired without it.",
        qs: [
          { type: "mcq", q: "What time does the speaker get up?", opts: ["Six o'clock", "Seven o'clock", "Eight o'clock"], a: 0 },
          { type: "tf", q: "The speaker often skips breakfast.", a: false },
          { type: "gap", q: "I drink a glass of ______ and do some exercise.", a: "water" }
        ]},
      { level: 2, rate: 0.95, title: "Tư vấn với chuyên viên học đường",
        script: "You look worried, Mai. — I can't sleep before exams. — How many hours do you sleep? — About five. — That's not enough. If you sleep less than seven hours, you may find it harder to concentrate. I suggest going to bed at the same time every night and leaving your phone outside the bedroom.",
        qs: [
          { type: "mcq", q: "What is Mai's problem?", opts: ["She can't sleep before exams", "She has no friends", "She eats too much"], a: 0 },
          { type: "mcq", q: "What does the counsellor advise?", opts: ["Keep a regular bedtime and no phone in bed", "Study later at night", "Drink more coffee"], a: 0 },
          { type: "gap", q: "If you sleep less than ______ hours, you may find it harder to concentrate.", a: "seven" }
        ]},
      { level: 3, rate: 1.0, title: "Sức khoẻ tinh thần của tuổi teen",
        script: "Doctors warn that stress among teenagers has risen sharply in the last ten years. The causes are not only exams. Long hours on social media, irregular sleep and a lack of physical activity all play a part. The good news is that small changes work. Thirty minutes of walking a day, a fixed bedtime and talking openly to one trusted adult can reduce anxiety significantly. What does not work is pretending everything is fine.",
        qs: [
          { type: "mcq", q: "According to the talk, what causes teenage stress?", opts: ["Exams, social media, poor sleep and little exercise", "Only exams", "Only family problems"], a: 0 },
          { type: "tf", q: "The speaker says small daily changes can help.", a: true },
          { type: "gap", q: "______ minutes of walking a day can reduce anxiety.", a: "Thirty" }
        ]}
    ]
  },
  unit4: {
    unit: 4, name: "Unit 4 · Remembering the Past",
    tasks: [
      { level: 1, rate: 0.82, title: "Ảnh cũ của gia đình",
        script: "This is a photo of my grandmother. She was twenty years old. She was wearing a traditional ao dai. Behind her you can see our old wooden house and a bamboo gate.",
        qs: [
          { type: "mcq", q: "Who is in the photo?", opts: ["The speaker's grandmother", "The speaker's mother", "The speaker"], a: 0 },
          { type: "tf", q: "She was wearing a modern dress.", a: false },
          { type: "gap", q: "Behind her you can see our old ______ house.", a: "wooden" }
        ]},
      { level: 2, rate: 0.95, title: "Tết ngày xưa",
        script: "What did you do at Tet when you were young, Grandma? — We were much poorer then. My mother was making five-coloured sticky rice while my father was cleaning the ancestral altar. We had no television, so the whole village gathered in the yard to sing. — Do you miss those days? — I do. I wish our village still had that old market.",
        qs: [
          { type: "mcq", q: "What was the grandmother's mother doing?", opts: ["Making sticky rice", "Cleaning the altar", "Singing in the yard"], a: 0 },
          { type: "mcq", q: "Why did the village gather in the yard?", opts: ["They had no television", "It was warmer outside", "They were cooking together"], a: 0 },
          { type: "gap", q: "I wish our village still ______ that old market.", a: "had" }
        ]},
      { level: 3, rate: 1.0, title: "Bảo tàng kí ức",
        script: "Last month our class visited a small museum run by a retired teacher. Instead of famous objects, it keeps everyday things: oil lamps, bicycle bells, old school reports. While we were looking at a handwritten letter from 1975, the owner told us that he had collected more than four thousand items in thirty years. He said the point was not the objects themselves, but the stories people tell when they see them.",
        qs: [
          { type: "mcq", q: "What kind of objects does the museum keep?", opts: ["Everyday things from ordinary life", "Famous historical treasures", "Modern art"], a: 0 },
          { type: "tf", q: "The owner collected the items over thirty years.", a: true },
          { type: "gap", q: "He had collected more than ______ thousand items.", a: "four" }
        ]}
    ]
  },
  unit5: {
    unit: 5, name: "Unit 5 · Our Experiences",
    tasks: [
      { level: 1, rate: 0.82, title: "Chuyến đi đáng nhớ",
        script: "I have been to Da Lat twice. The weather was cool and the flowers were beautiful. I have never seen so many pine trees. It was my favourite trip.",
        qs: [
          { type: "mcq", q: "How many times has the speaker been to Da Lat?", opts: ["Twice", "Once", "Three times"], a: 0 },
          { type: "tf", q: "The weather was very hot.", a: false },
          { type: "gap", q: "I have never seen so many ______ trees.", a: "pine" }
        ]},
      { level: 2, rate: 0.95, title: "Ở homestay",
        script: "Have you ever stayed with a local family? — Yes, I have. Last summer I stayed in a homestay in Sa Pa for five days. — What did you do there? — I helped the family cook, and I learnt to plant rice. It was exhilarating, but my back hurt for a week afterwards.",
        qs: [
          { type: "mcq", q: "How long did the speaker stay?", opts: ["Five days", "Two days", "A week"], a: 0 },
          { type: "mcq", q: "What did the speaker learn to do?", opts: ["Plant rice", "Weave cloth", "Ride a buffalo"], a: 0 },
          { type: "gap", q: "It was ______, but my back hurt for a week.", a: "exhilarating" }
        ]},
      { level: 3, rate: 1.0, title: "Du lịch sinh thái có trách nhiệm",
        script: "Since eco-tourism became popular, some communities have earned a stable income for the first time. But experts warn that the word eco is often only a label. A genuine eco-tour limits group size, hires local guides and returns part of its profit to the village. Travellers can check this easily: ask who owns the accommodation, and ask where the waste goes. If nobody can answer, the tour is probably not what it claims to be.",
        qs: [
          { type: "mcq", q: "What makes a genuine eco-tour?", opts: ["Small groups, local guides, profit shared with the village", "Cheap prices and big groups", "Five-star hotels in nature"], a: 0 },
          { type: "tf", q: "The speaker says the label 'eco' always guarantees quality.", a: false },
          { type: "gap", q: "Ask who owns the accommodation, and ask where the ______ goes.", a: "waste" }
        ]}
    ]
  },
  unit6: {
    unit: 6, name: "Unit 6 · Vietnamese Lifestyles: Then and Now",
    tasks: [
      { level: 1, rate: 0.82, title: "Nhà xưa và nhà nay",
        script: "My grandparents lived in a house made of natural materials: wood, bamboo and leaves. Today we live in a flat on the eighth floor. It is more comfortable, but I miss the garden.",
        qs: [
          { type: "mcq", q: "What was the old house made of?", opts: ["Wood, bamboo and leaves", "Brick and concrete", "Glass and steel"], a: 0 },
          { type: "tf", q: "The speaker misses the garden.", a: true },
          { type: "gap", q: "Today we live in a flat on the ______ floor.", a: "eighth" }
        ]},
      { level: 2, rate: 0.95, title: "Chợ truyền thống hay siêu thị",
        script: "Do you prefer the market or the supermarket, Mum? — I still enjoy going to the market. The vegetables are fresher and I can talk to the sellers. — But the supermarket is air-conditioned. — True. Your grandmother avoided using plastic bags. She always took a bamboo basket. I decided to do the same last year.",
        qs: [
          { type: "mcq", q: "Why does the mother prefer the market?", opts: ["Fresher vegetables and she can talk to sellers", "It is cheaper and faster", "It is air-conditioned"], a: 0 },
          { type: "mcq", q: "What did the grandmother always take?", opts: ["A bamboo basket", "A plastic bag", "A paper box"], a: 0 },
          { type: "gap", q: "Your grandmother avoided ______ plastic bags.", a: "using" }
        ]},
      { level: 3, rate: 1.0, title: "Điều gì còn lại sau bao thay đổi",
        script: "Fifty years ago, most Vietnamese families cooked over a wood fire and washed clothes by hand. Today almost every household has a rice cooker and a washing machine. Sociologists note, however, that one habit has hardly changed: the shared family meal. Even in busy cities, more than seventy per cent of families still eat dinner together at least five evenings a week. They argue that this daily half hour, not the technology, is what keeps family life stable.",
        qs: [
          { type: "mcq", q: "Which habit has hardly changed?", opts: ["Eating dinner together", "Cooking over a wood fire", "Washing clothes by hand"], a: 0 },
          { type: "tf", q: "Sociologists credit technology for stable family life.", a: false },
          { type: "gap", q: "More than ______ per cent of families still eat dinner together.", a: "seventy" }
        ]}
    ]
  },
  unit7: {
    unit: 7, name: "Unit 7 · Natural Wonders of the World",
    tasks: [
      { level: 1, rate: 0.82, title: "Vịnh Hạ Long",
        script: "Ha Long Bay is a natural wonder in the north of Viet Nam. There are about one thousand six hundred islands. Many visitors take a boat trip to see the caves.",
        qs: [
          { type: "mcq", q: "Where is Ha Long Bay?", opts: ["In the north of Viet Nam", "In the south", "In the central region"], a: 0 },
          { type: "tf", q: "Visitors can see caves there.", a: true },
          { type: "gap", q: "There are about one thousand six hundred ______.", a: "islands" }
        ]},
      { level: 2, rate: 0.95, title: "Hỏi về chuyến leo núi",
        script: "My cousin asked me if I had ever climbed Fansipan. I told him I had, two years ago. He wanted to know whether the weather would allow us to climb again that weekend. I said the guide had warned us about heavy rain, so we should wait until October.",
        qs: [
          { type: "mcq", q: "What did the cousin want to know?", opts: ["If the weather would allow them to climb", "How much the trip cost", "Where to buy tickets"], a: 0 },
          { type: "mcq", q: "What did the guide warn about?", opts: ["Heavy rain", "Strong wind", "Landslides"], a: 0 },
          { type: "gap", q: "We should wait until ______.", a: "October" }
        ]},
      { level: 3, rate: 1.0, title: "Kỳ quan đang biến mất",
        script: "The Great Barrier Reef has lost about half of its corals since 1995. Scientists explain that warmer water forces corals to expel the algae that feed them, and the reef turns white. A reporter asked one researcher whether the damage could be reversed. She answered that some reefs do recover if the water cools within a few years, but repeated heatwaves leave no time for recovery. The real question, she said, is not whether we can repair reefs, but whether we can stop warming the sea.",
        qs: [
          { type: "mcq", q: "Why do corals turn white?", opts: ["Warm water forces them to expel algae", "Tourists touch them", "Fish eat them"], a: 0 },
          { type: "tf", q: "The researcher says reefs can never recover.", a: false },
          { type: "gap", q: "The reef has lost about ______ of its corals since 1995.", a: "half" }
        ]}
    ]
  },
  unit8: {
    unit: 8, name: "Unit 8 · Tourism",
    tasks: [
      { level: 1, rate: 0.82, title: "Đặt phòng khách sạn",
        script: "Good morning. I'd like to book a room for two nights. — Certainly. We have an affordable room on the third floor. Breakfast is included.",
        qs: [
          { type: "mcq", q: "How many nights does the guest want?", opts: ["Two", "Three", "One"], a: 0 },
          { type: "tf", q: "Breakfast is included.", a: true },
          { type: "gap", q: "We have an affordable room on the ______ floor.", a: "third" }
        ]},
      { level: 2, rate: 0.95, title: "Hướng dẫn viên du lịch",
        script: "The guide who showed us the cave was very friendly. She explained that the resort which we booked online was much cheaper than the one the agency suggested. She also told us about a traveller whose passport was lost last week, and advised us to keep our documents in the hotel safe.",
        qs: [
          { type: "mcq", q: "What did the guide advise?", opts: ["Keep documents in the hotel safe", "Book only through an agency", "Avoid the cave"], a: 0 },
          { type: "mcq", q: "Which resort was cheaper?", opts: ["The one booked online", "The one the agency suggested", "Both cost the same"], a: 0 },
          { type: "gap", q: "She told us about a traveller ______ passport was lost.", a: "whose" }
        ]},
      { level: 3, rate: 1.0, title: "Du lịch quá tải",
        script: "Some famous destinations now receive more visitors in one summer than they have residents in ten years. In several European cities, local people have protested because rents have doubled and ordinary shops have been replaced by souvenir stalls. A few places have responded by limiting cruise ships or charging a small entrance fee. Tourism experts say these measures are not anti-tourist. They simply recognise that a city which serves only visitors stops being a city at all.",
        qs: [
          { type: "mcq", q: "Why have local people protested?", opts: ["Rents doubled and ordinary shops disappeared", "Hotels were too expensive", "Tourists were unfriendly"], a: 0 },
          { type: "tf", q: "Experts say the measures are anti-tourist.", a: false },
          { type: "gap", q: "A few places have responded by limiting ______ ships.", a: "cruise" }
        ]}
    ]
  },
  unit9: {
    unit: 9, name: "Unit 9 · World Englishes",
    tasks: [
      { level: 1, rate: 0.82, title: "Tiếng Anh ở nhiều nước",
        script: "English is spoken in many countries. People in Britain, America, Australia and Singapore all speak English, but their accents are different. That is why we call them World Englishes.",
        qs: [
          { type: "mcq", q: "What is different between these countries?", opts: ["Their accents", "Their alphabets", "Their grammar rules"], a: 0 },
          { type: "tf", q: "Only Britain and America speak English.", a: false },
          { type: "gap", q: "That is why we call them World ______.", a: "Englishes" }
        ]},
      { level: 2, rate: 0.95, title: "Giọng nào là chuẩn",
        script: "My teacher says students who learn English online often improve quickly, because they hear many different accents. The English spoken in India has its own rhythm, and Singapore English uses some Malay words. She told us that no accent is the correct one. What matters is clarity: can the listener understand you?",
        qs: [
          { type: "mcq", q: "What does the teacher say matters most?", opts: ["Clarity", "A British accent", "Speaking fast"], a: 0 },
          { type: "mcq", q: "Why do online learners improve quickly?", opts: ["They hear many accents", "They study longer", "They have better books"], a: 0 },
          { type: "gap", q: "Singapore English uses some ______ words.", a: "Malay" }
        ]},
      { level: 3, rate: 1.0, title: "Người nói tiếng Anh nhiều hơn ta tưởng",
        script: "There are roughly four hundred million people who speak English as a first language, but well over a billion who use it as a second or foreign language. In other words, most English conversations in the world today happen between two non-native speakers. Linguists argue that this changes what good English means. A speaker who adapts, repeats and checks understanding communicates better than one with a perfect accent who never notices that nobody follows.",
        qs: [
          { type: "mcq", q: "What is the main point?", opts: ["Most English conversations are between non-native speakers", "British English is the standard", "English is getting harder"], a: 0 },
          { type: "tf", q: "The speaker values a perfect accent above being understood.", a: false },
          { type: "gap", q: "Roughly ______ hundred million people speak English as a first language.", a: "four" }
        ]}
    ]
  },
  unit10: {
    unit: 10, name: "Unit 10 · Planet Earth",
    tasks: [
      { level: 1, rate: 0.82, title: "Hành tinh của chúng ta",
        script: "The Earth is the third planet from the Sun. About seventy per cent of its surface is water. It is the only planet we know that has life.",
        qs: [
          { type: "mcq", q: "Which planet from the Sun is the Earth?", opts: ["The third", "The second", "The fourth"], a: 0 },
          { type: "tf", q: "Most of the Earth's surface is land.", a: false },
          { type: "gap", q: "About ______ per cent of its surface is water.", a: "seventy" }
        ]},
      { level: 2, rate: 0.95, title: "Băng tan",
        script: "The Amazon, which produces much of our oxygen, is shrinking fast. At the same time, sea levels are rising, which worries many scientists. Mount Everest, which is eight thousand eight hundred and forty-nine metres high, has lost snow at its base. Researchers say the two problems have the same cause: a warmer atmosphere.",
        qs: [
          { type: "mcq", q: "What do the two problems share?", opts: ["A warmer atmosphere", "Heavy rainfall", "Volcanic activity"], a: 0 },
          { type: "mcq", q: "What is happening to the Amazon?", opts: ["It is shrinking", "It is growing", "It is unchanged"], a: 0 },
          { type: "gap", q: "Sea levels are rising, ______ worries many scientists.", a: "which" }
        ]},
      { level: 3, rate: 1.0, title: "Việc nhỏ có đáng làm không",
        script: "People often ask whether individual action matters when factories produce far more emissions than households. The honest answer is that one person changing a light bulb makes almost no difference. But researchers who study behaviour point out something else: habits spread. When a family installs solar panels, neighbours are measurably more likely to do the same within two years. Individual choices matter less as arithmetic and more as signals to everyone watching.",
        qs: [
          { type: "mcq", q: "Why do individual choices matter, according to the talk?", opts: ["They spread to other people", "They cut most emissions", "They save the most money"], a: 0 },
          { type: "tf", q: "The speaker claims one light bulb makes a big difference.", a: false },
          { type: "gap", q: "Neighbours are more likely to do the same within ______ years.", a: "two" }
        ]}
    ]
  },
  unit11: {
    unit: 11, name: "Unit 11 · Electronic Devices",
    tasks: [
      { level: 1, rate: 0.82, title: "Thiết bị trong nhà",
        script: "We have many electronic devices at home: a smart TV, a laptop and a tablet. My little sister uses the tablet to learn English. My father says we should turn them off at night.",
        qs: [
          { type: "mcq", q: "What does the sister use the tablet for?", opts: ["Learning English", "Playing games", "Watching films"], a: 0 },
          { type: "tf", q: "The father wants the devices off at night.", a: true },
          { type: "gap", q: "We have a smart TV, a laptop and a ______.", a: "tablet" }
        ]},
      { level: 2, rate: 0.95, title: "Chọn máy để học",
        script: "Should I buy a tablet or a laptop? — For writing essays, I recommend buying a laptop. A tablet is lighter, but typing on glass is slow. — What about the battery? — The teacher advised me to check battery life first. She suggested turning off background apps to make the charge last longer.",
        qs: [
          { type: "mcq", q: "What is recommended for writing essays?", opts: ["A laptop", "A tablet", "A phone"], a: 0 },
          { type: "mcq", q: "What did the teacher suggest?", opts: ["Turning off background apps", "Buying a second battery", "Studying offline"], a: 0 },
          { type: "gap", q: "A tablet is lighter, but typing on glass is ______.", a: "slow" }
        ]},
      { level: 3, rate: 1.0, title: "Rác điện tử",
        script: "The world throws away more than fifty million tonnes of electronic waste every year, and less than a quarter of it is properly recycled. A single smartphone contains gold, silver and rare metals worth recovering, yet most devices end up buried or burnt. Engineers suggest designing phones that open with ordinary screws instead of glue, so a broken battery does not mean a dead phone. Repair, they argue, is the cheapest form of recycling.",
        qs: [
          { type: "mcq", q: "What do engineers suggest?", opts: ["Designing phones that are easy to open and repair", "Making phones smaller", "Banning smartphones"], a: 0 },
          { type: "tf", q: "Most electronic waste is properly recycled.", a: false },
          { type: "gap", q: "The world throws away more than ______ million tonnes of e-waste a year.", a: "fifty" }
        ]}
    ]
  },
  unit12: {
    unit: 12, name: "Unit 12 · Career Choices",
    tasks: [
      { level: 1, rate: 0.82, title: "Ước mơ nghề nghiệp",
        script: "I want to be a doctor because I like helping people. My brother wants to be an electrician. My best friend hopes to become a graphic designer.",
        qs: [
          { type: "mcq", q: "What does the speaker want to be?", opts: ["A doctor", "An electrician", "A designer"], a: 0 },
          { type: "tf", q: "The brother wants to be a teacher.", a: false },
          { type: "gap", q: "My best friend hopes to become a graphic ______.", a: "designer" }
        ]},
      { level: 2, rate: 0.95, title: "Phỏng vấn một thợ điện",
        script: "Why did you choose this job? — Despite the low salary at first, I really loved the work. It was such an interesting career that I changed my whole plan. — Was the training difficult? — Very. The course was so demanding that many students quit, but I finished it and now I train apprentices myself.",
        qs: [
          { type: "mcq", q: "Why did she stay in the job?", opts: ["She loved the work", "The salary was high", "Her family told her to"], a: 0 },
          { type: "mcq", q: "What does she do now?", opts: ["She trains apprentices", "She teaches at a school", "She runs a shop"], a: 0 },
          { type: "gap", q: "The course was so ______ that many students quit.", a: "demanding" }
        ]},
      { level: 3, rate: 1.0, title: "Nghề nghiệp trong mười năm tới",
        script: "Careers advisers used to tell students to pick one job and stay in it. That advice has aged badly. A student starting school today is likely to change not only jobs but entire fields two or three times. Because of this, advisers now focus on transferable skills: clear writing, working in a team, and learning something new quickly. They add one warning. Choosing a field only because it pays well today is risky, since the highest-paid jobs of the 2030s may not exist yet.",
        qs: [
          { type: "mcq", q: "What do advisers focus on now?", opts: ["Transferable skills", "One job for life", "The highest salary"], a: 0 },
          { type: "tf", q: "Advisers warn against choosing a field only for today's pay.", a: true },
          { type: "gap", q: "Students may change entire fields ______ or three times.", a: "two" }
        ]}
    ]
  }
};
