// ============================================================
// MIT ヒアリングフォーム v3.6 — script.js（パズルメニュー対応）
// ============================================================

// デフォルト送信先
const DEFAULT_MAIL_TO = 'ns.morizo@gmail.com';

let startTime = null;

// ・・・（音声入力など、既存コードはそのまま）・・・

function getVal(id)    { return (document.getElementById(id) || { value: '' }).value.trim(); }
function getRadio(nm)  { const el = document.querySelector(`input[name="${nm}"]:checked`); return el ? el.value : ''; }
function getChecks(nm) { return [...document.querySelectorAll(`input[name="${nm}"]:checked`)].map(e => e.value); }

function getQ3Value()  { const v = getRadio('q3');  return v === 'その他' ? `その他（${getVal('q3-other-text')}）`  : (v || ''); }
function getQ4Value()  { const v = getRadio('q4');  return v === 'その他' ? `その他（${getVal('q4-other-text')}）`  : (v || ''); }
function getQ6Values() { return getChecks('q6').map(v  => v === 'その他' ? `その他（${getVal('q6-other-text')}）`  : v); }
function getQ9Values() { return getChecks('q9').map(v  => v === 'その他' ? `その他（${getVal('q9-other-text')}）`  : v); }
function getQ12Values(){ return getChecks('q12').map(v => v === 'その他' ? `その他（${getVal('q12-other-text')}）` : v); }
function getIdeaTypes(){ return getChecks('q10_type'); }

// ============================================================
// プログレスバー（その場メモは「おまけ扱い」でカウントに含めない）
// ============================================================
function updateProgress() {
  if (!startTime) startTime = new Date();
  const items = [
    getVal('q1'), getVal('q2'), getVal('q2b'), getQ3Value(), getQ4Value(),
    getRadio('q5'), getChecks('q6').length > 0 ? '1' : '',
    getVal('q7'), getVal('q8'), getQ9Values().length > 0 ? '1' : '',
    getVal('q10'), getChecks('q12').length > 0 ? '1' : '', getVal('q13')
    // memo_p / memo_c / memo_i / memo_o は進捗には含めない
  ];
  const filled = items.filter(v => v !== '').length;
  const pct    = Math.round(filled / items.length * 100);
  const label  = document.getElementById('progress-label');
  const pctEl  = document.getElementById('progress-pct');
  const fill   = document.getElementById('progressFill');

  if (label) {
    label.textContent =
      filled === 0
        ? '書きやすいところから少しずつ記録を始めてください'
        : `フォーム全体の ${filled} / ${items.length} ピースが記録済みです`;
  }
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (fill)  fill.style.width  = `${pct}%`;
}

// ・・・（フィードバック関数などは既存のまま）・・・

function buildText() {
  const q6v       = getQ6Values();
  const q9v       = getQ9Values();
  const q12v      = getQ12Values();
  const ideaTypes = getIdeaTypes();
  const memoP     = getVal('memo_p');
  const memoC     = getVal('memo_c');
  const memoI     = getVal('memo_i');
  const memoO     = getVal('memo_o');
  const endTime   = new Date();
  const diffMs    = startTime ? endTime - startTime : 0;
  const elapsed   = startTime
    ? `${Math.floor(diffMs/60000)}分${Math.floor((diffMs%60000)/1000)}秒` : '不明';

  return [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '　Medical Innovation Triage — ヒアリング記録　',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '【発案者情報】',
    `所属部署　　　：${getVal('q1') || '（未記入）'}`,
    `氏　　名　　　：${getVal('q2') || '（未記入）'}`,
    `メールアドレス：${getVal('q2b') || '（未記入）'}`,
    `職　　種　　　：${getQ3Value() || '（未選択）'}`,
    '',
    '【P：現場の困りごと・背景】',
    `困っている対象：${getQ4Value() || '（未選択）'}`,
    `発生頻度　　　：${getRadio('q5') || '（未選択）'}`,
    `困りごと・影響：${q6v.join(' / ') || '（未選択）'}`,
    `具体的な場面　：${getVal('q7') || '（未記入）'}`,
    `Pに関するメモ：${memoP || '（なし）'}`,
    '',
    '【C：今の対応とその限界】',
    `現在の対応　　　　：${getVal('q8') || '（未記入）'}`,
    `うまくいっていない点：${q9v.length ? q9v.join(' / ') : '特になし'}`,
    `Cに関するメモ：${memoC || '（なし）'}`,
    '',
    '【I：アイデア・ひらめき】',
    `アイデア内容　：${getVal('q10') || '（未記入）'}`,
    `アイデアの形　：${ideaTypes.length ? ideaTypes.join(' / ') : '（未選択）'}`,
    `具体イメージ　：${getVal('q10_detail') || '（未記入）'}`,
    `参考にしたもの：${getVal('q10_ref') || '（未記入）'}`,
    `懸念・課題　　：${getVal('q10_concern') || '（未記入）'}`,
    `Iに関するメモ：${memoI || '（なし）'}`,
    '',
    '【O：期待できる効果】',
    `期待される改善：${q12v.join(' / ') || '（未選択）'}`,
    `改善の規模感　：${getVal('q13') || '（未記入）'}`,
    `Oに関するメモ：${memoO || '（なし）'}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `記録日時　　　　　：${endTime.toLocaleString('ja-JP')}`,
    `ヒアリング所要時間：${elapsed}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

// showPreview / actionCopy / actionSaveToFolder / メール送信などは
// 元のコードからそのまま（変更なし）で使えます。

// clearStep のときにメモも消したい場合は、各 case に追記：
function clearStep(step) {
  if (!confirm('このステップの入力内容をクリアしますか？')) return;
  switch (step) {
    case 1:
      // ...既存のクリア処理...
      document.getElementById('memo_p').value = '';
      break;
    case 2:
      // ...既存のクリア処理...
      document.getElementById('memo_c').value = '';
      break;
    case 3:
      // ...既存のクリア処理...
      document.getElementById('memo_i').value = '';
      break;
    case 4:
      // ...既存のクリア処理...
      document.getElementById('memo_o').value = '';
      break;
  }
  updateProgress();
}

// DOMContentLoaded 〜 も既存のまま（ロードマップ／パズルナビ）でOK
