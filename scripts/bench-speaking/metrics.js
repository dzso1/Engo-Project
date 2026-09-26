const S=require('../../services/speaking-scorer');const T=require('./testset');
const N=s=>S.normalizeWords(s);
function strictFlags(t,s){const a=N(t),b=N(s);return a.map((w,i)=>b[i]!==w);}
const out={};
{let changed=0,eR=0,eY=0,eG=0,oR=0;
 T.filter(x=>x.g==='B').forEach(x=>{const a=N(x.t),b=N(x.s);const e=S.scorePronunciation(x.t,x.s).breakdown;const o=strictFlags(x.t,x.s);
  a.forEach((w,i)=>{if(w!==b[i]){changed++; const st=e[i].status; if(st==='missed')eR++; else if(st==='near')eY++; else eG++; if(o[i])oR++;}});});
 out.B={changed,engo_do:eR,engo_vang:eY,engo_xanh:eG,cu_do:oR};}
{let n=0,gram=0,pron=0,oPron=0;
 T.filter(x=>x.g==='C').forEach(x=>{const r=S.scorePronunciation(x.t,x.s);const a=N(x.t),b=N(x.s);const o=strictFlags(x.t,x.s);
  a.forEach((w,i)=>{if(w!==b[i]){n++; const st=r.breakdown[i].status; if(st==='ending')gram++; else if(st!=='correct')pron++; if(o[i])oPron++;}});});
 out.C={n,engo_ngu_phap:gram,engo_phat_am:pron,cu_bao_loi_phat_am:oPron};}
{let rows=[];T.filter(x=>x.g==='D').forEach(x=>{const r=S.scorePronunciation(x.t,x.s);
  const flagged=r.breakdown.filter(b=>b.status!=='correct').length; rows.push({t:x.t,acc:r.accuracy,flagged,red:r.breakdown.filter(b=>b.status==='missed').length});});
 out.D=rows;}
{let eFlag=0,oFlag=0,eAcc=0,oAcc=0,k=0;T.filter(x=>x.g==='E').forEach(x=>{const r=S.scorePronunciation(x.t,x.s);k++;
  eFlag+=r.breakdown.filter(b=>b.status!=='correct').length; oFlag+=strictFlags(x.t,x.s).filter(Boolean).length; eAcc+=r.accuracy;
  const a=N(x.t),b=N(x.s);let ok=0;a.forEach((w,i)=>{if(b[i]===w)ok++;});oAcc+=ok/a.length*100;});
 out.E={cau:k,tu_thuc_su_sot:k,engo_tu_bao_loi:eFlag,cu_tu_bao_loi:oFlag,engo_diem_tb:+(eAcc/k).toFixed(1),cu_diem_tb:+(oAcc/k).toFixed(1)};}
{let eF=0,oF=0,words=0;T.filter(x=>x.g==='A').forEach(x=>{const r=S.scorePronunciation(x.t,x.s);words+=N(x.t).length;eF+=r.breakdown.filter(b=>b.status!=='correct').length;oF+=strictFlags(x.t,x.s).filter(Boolean).length;});out.A={words,engo_bao_nham:eF,cu_bao_nham:oF};}
console.log(JSON.stringify(out,null,1));
