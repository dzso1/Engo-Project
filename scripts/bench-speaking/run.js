const S = require('../../services/speaking-scorer');
const T = require('./testset');
const norm = s => S.normalizeWords(s);

function strictScore(t, s) {
  const a = norm(t), b = norm(s);
  let ok = 0; const bad = [];
  a.forEach((w, i) => { if (b[i] === w) ok++; else bad.push(w); });
  return { acc: Math.round(ok / a.length * 100), wrong: bad.length, bad };
}

const rows = [];
for (const x of T) {
  const e = S.scorePronunciation(x.t, x.s);
  const st = strictScore(x.t, x.s);
  const tw = norm(x.t);
  const pronErr = e.breakdown.filter(b => b.status === 'missed' || b.status === 'near').length;
  const redWords = e.breakdown.filter(b => b.status === 'missed').map(b => b.word);
  const gram = e.errors.filter(r => r.type === 'grammar').length;
  rows.push({ g: x.g, t: x.t, s: x.s, n: x.n || '', words: tw.length,
    engo: e.accuracy, engoVerdict: S.verdictFor(e.accuracy), pronErr, redWords, gram,
    strict: st.acc, strictWrong: st.wrong, strictBad: st.bad });
}
require('fs').writeFileSync(require('path').join(__dirname,'results.json'), JSON.stringify(rows, null, 1));

const G = { A: 'Đọc đúng', B: 'Giọng Việt', C: 'Thiếu đuôi -s/-ed', D: 'Đọc sai hẳn', E: 'Sót 1 từ' };
for (const g of 'ABCDE') {
  const r = rows.filter(x => x.g === g);
  const avg = k => (r.reduce((a, x) => a + x[k], 0) / r.length).toFixed(1);
  const sum = k => r.reduce((a, x) => a + x[k], 0);
  console.log(`\n== ${g}. ${G[g]} (${r.length} câu) ==`);
  console.log(`  ENGO   : điểm TB ${avg('engo')}  | từ bị báo lỗi phát âm: ${sum('pronErr')} | lỗi ngữ pháp nhận ra: ${sum('gram')}`);
  console.log(`  Cách cũ: điểm TB ${avg('strict')} | từ bị báo sai: ${sum('strictWrong')}`);
}
