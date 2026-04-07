// ============================================================
//  MIT アイデア提案フォーム v3 — script.js
// ============================================================

let startTime = null;

// ============================================================
//  カメラ関連
// ============================================================
let cameraStream = null;
// 撮影・選択された画像を保持（base64 または File URL）
const capturedPhotos = []; // { dataUrl, name }

function openCamera() {
  const container = document.getElementById('cameraContainer');
  const video = document.getElementById('cameraVideo');
  container.style.display = 'block';
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    .then(stream => {
      cameraStream = stream;
      video.srcObject = stream;
    })
    .catch(err => {
      alert('カメラにアクセスできませんでした。\n' + err.message);
      container.style.display = 'none';
    });
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  document.getElementById('cameraContainer').style.display = 'none';
}

function capturePhoto() {
  const video  = document.getElementById('cameraVideo');
  const canvas = document.getElementById('photoCanvas');
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const name = `photo_${Date.now()}.jpg`;
  capturedPhotos.push({ dataUrl, name });
  addPhotoPreview(dataUrl, name);
  closeCamera();
}

function onFileSelect(event) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      capturedPhotos.push({ dataUrl, name: file.name });
      addPhotoPreview(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  });
  // 同じファイルを再選択できるようリセット
  event.target.value = '';
}

function addPhotoPreview(dataUrl, name) {
  const area = document.getElementById('photoPreviewArea');
  const wrap = document.createElement('div');
  wrap.className = 'photo-thumb';
  const idx = capturedPhotos.length - 1;

  if (dataUrl.startsWith('data:image')) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = name;
    wrap.appendChild(img);
  } else {
    const label = document.createElement('div');
    label.className = 'photo-thumb-label';
    label.textContent = name;
    wrap.appendChild(label);
  }
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'photo-thumb-del';
  del.textContent = '✕';
  del.onclick = () => {
    capturedPhotos.splice(idx, 1);
    area.removeChild(wrap);
  };
  wrap.appendChild(del);
  area.appendChild(wrap);
}

// ============================================================
//  UI ヘルパー
// ============================================================
const FORM_UI_IDS = ['picoRoadmap', 'progressWrap', 'navigator', 'ideaForm'];

function hideFormUI() {
  FORM_UI_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}
function showFormUI() {
  FORM_UI_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
}

// ============================================================
//  ステップ管理
// ============================================================
let currentStep = 0;
const TOTAL_STEPS = 5;

const NAV_MESSAGES = [
  'まず<strong>あなたの情報</strong>を入力してください（すべて任意です）。',
  '<strong>誰が、どのような場面で困っているか</strong>を教えてください。日常の業務で感じていることをそのままで構いません。',
  '<strong>現在どのように対応しているか</strong>を教えてください。「とりあえずこうしている」という工夫も大切な情報です。',
  '<strong>あなたのアイデア</strong>を教えてください。思いついたことをそのままで構いません。完成していなくても歓迎です。',
  'もう少しで完了です。<strong>このアイデアで何が変わりそうか</strong>を教えてください。'
];

function showStep(step) {
  document.querySelectorAll('.step-section').forEach((s, i) => {
    s.classList.toggle('active', i === step);
  });
  for (let i = 0; i < TOTAL_STEPS; i++) {
    const rm = document.getElementById(`rm${i}`);
    if (!rm) continue;
    rm.className = 'roadmap-step';
    if (i < step)   rm.classList.add('done');
    if (i === step) rm.classList.add('active');
    if (i < TOTAL_STEPS - 1) {
      const line = document.getElementById(`rml${i}`);
      if (line) line.className = 'roadmap-line' + (i < step ? ' done' : '');
    }
  }
  const bubble = document.getElementById('navBubble');
  if (bubble) bubble.innerHTML = NAV_MESSAGES[step];
  window.scrollTo({ top: 0, behavior: 'smooth' });
  currentStep = step;
}

// ============================================================
//  バリデーション（STEP1は全任意、STEP4はq11削除）
// ============================================================
const STEP_REQUIRED = [
  // Step 0: 基本情報 — すべて任意
  () => [],
  // Step 1: 困りごと
  () => {
    const errs = [];
    if (!getRadio('q4'))              errs.push('・困っている対象を選択してください');
    if (!getRadio('q5'))              errs.push('・発生頻度を選択してください');
    if (getChecks('q6').length === 0) errs.push('・影響の種類を1つ以上選択してください');
    return errs;
  },
  // Step 2: 今の対応 — 任意
  () => [],
  // Step 3: アイデア（q11削除済み）
  () => {
    const errs = [];
    if (!getVal('q10')) errs.push('・アイデアを入力してください');
    return errs;
  },
  // Step 4: 期待効果
  () => {
    const errs = [];
    if (getChecks('q12').length === 0) errs.push('・期待できる改善を1つ以上選択してください');
    return errs;
  }
];

function goNext(step) {
  const errs = STEP_REQUIRED[step]();
  if (errs.length > 0) {
    alert('入力内容を確認してください：\n\n' + errs.join('\n'));
    return;
  }
  showStep(step + 1);
}
function goPrev(step) { showStep(step - 1); }

// ============================================================
//  ユーティリティ
// ============================================================
function getVal(id)    { return (document.getElementById(id) || { value: '' }).value.trim(); }
function getRadio(nm)  { const el = document.querySelector(`input[name="${nm}"]:checked`); return el ? el.value : ''; }
function getChecks(nm) { return [...document.querySelectorAll(`input[name="${nm}"]:checked`)].map(e => e.value); }

function getQ3Value() {
  const v = getRadio('q3');
  if (v === 'その他') {
    const other = getVal('q3-other-text');
    return other ? `その他（${other}）` : 'その他';
  }
  return v || '';
}
function getQ4Value() {
  const v = getRadio('q4');
  if (v === 'その他') {
    const other = getVal('q4-other-text');
    return other ? `その他（${other}）` : 'その他';
  }
  return v || '';
}
function getQ6Values() {
  return getChecks('q6').map(v => {
    if (v === 'その他') {
      const other = getVal('q6-other-text');
      return other ? `その他（${other}）` : 'その他';
    }
    return v;
  });
}
function getQ9Values() {
  return getChecks('q9').map(v => {
    if (v === 'その他') {
      const other = getVal('q9-other-text');
      return other ? `その他（${other}）` : 'その他';
    }
    return v;
  });
}
function getQ12Values() {
  return getChecks('q12').map(v => {
    if (v === 'その他') {
      const other = getVal('q12-other-text');
      return other ? `その他（${other}）` : 'その他';
    }
    return v;
  });
}
function getIdeaTypes() { return getChecks('q10_type'); }

// ===== フィードバック表示 =====
function showFeedback(id, msg, type) {
  const el = document.getElementById(`fb-${id}`);
  if (!el) return;
  el.textContent = msg;
  el.className = `field-fb fb-${type} show`;
}
function hideFeedback(id) {
  const el = document.getElementById(`fb-${id}`);
  if (el) { el.className = 'field-fb'; el.textContent = ''; }
}

function highlightSelected(groupId) {
  document.querySelectorAll(`#${groupId} label`).forEach(lbl => {
    lbl.classList.toggle('selected', lbl.querySelector('input').checked);
  });
}
function highlightChecked(groupId) {
  document.querySelectorAll(`#${groupId} label`).forEach(lbl => {
    lbl.classList.toggle('selected', lbl.querySelector('input').checked);
  });
}

function toggleOtherInput(checkId, wrapId) {
  const checked = document.getElementById(checkId).checked;
  const wrap = document.getElementById(wrapId);
  wrap.classList.toggle('show', checked);
  if (!checked) {
    const ta = wrap.querySelector('textarea');
    if (ta) ta.value = '';
  }
}
function toggleOtherInputRadio(radioId, wrapId) {
  const isOtherSelected = document.getElementById(radioId).checked;
  const wrap = document.getElementById(wrapId);
  wrap.classList.toggle('show', isOtherSelected);
  if (!isOtherSelected) {
    const ta = wrap.querySelector('textarea');
    if (ta) ta.value = '';
  }
}

// ============================================================
//  プログレスバー（11項目：q11削除、基本情報任意）
// ============================================================
function updateProgress() {
  if (!startTime) startTime = new Date();
  const items = [
    getVal('q1'), getVal('q2'), getVal('q2b'),
    getQ3Value(), getQ4Value(),
    getRadio('q5'), getChecks('q6').length > 0 ? '1' : '',
    getVal('q7'), getVal('q8'), getQ9Values().length > 0 ? '1' : '0',
    getVal('q10'), getChecks('q12').length > 0 ? '1' : '', getVal('q13')
  ];
  const filled = items.filter(v => v !== '').length;
  const pct    = Math.round(filled / items.length * 100);

  const label = document.getElementById('progress-label');
  const pctEl = document.getElementById('progress-pct');
  const fill  = document.getElementById('progressFill');
  if (label) label.textContent = filled === 0 ? '入力を始めましょう' : `${filled} / ${items.length} 項目入力済み`;
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (fill)  fill.style.width  = `${pct}%`;
}
document.addEventListener('change', updateProgress);
document.addEventListener('input',  updateProgress);

// ============================================================
//  フィードバック関数
// ============================================================
function onSelectChange(id) {
  const v = getVal(id);
  if (v) showFeedback(id, `✅ 「${v}」で登録します`, 'good');
  else   hideFeedback(id);
}
function onTextInput(id) {
  const v = getVal(id);
  if (!v) { hideFeedback(id); return; }
  if (v.length < 2) {
    showFeedback(id, 'フルネームでご記入ください', 'warn');
    return;
  }
  showFeedback(id, `✅ ${v} さん、ありがとうございます`, 'good');
}
function onEmailInput(id) {
  const v = getVal(id);
  if (!v) { hideFeedback(id); return; }
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (isEmail) showFeedback(id, `✅ 「${v}」を登録しました`, 'good');
  else         showFeedback(id, '⚠️ メールアドレスの形式を確認してください（例：yamada@hospital.jp）', 'warn');
}
function onRadioChange(groupId) {
  highlightSelected(groupId);
  updateProgress();
  const v = getRadio(groupId);
  if (v) showFeedback(groupId, `✅ 「${v}」を選択しました`, 'good');
}
function onCheckChange(groupId) {
  highlightChecked(groupId);
  updateProgress();
  const vals = getChecks(groupId);
  if (vals.length > 0) showFeedback(groupId, `✅ ${vals.length}項目選択中`, 'good');
  else hideFeedback(groupId);
}
function onTextareaInput(id) {
  updateProgress();
  const v = getVal(id);
  if (v.length >= 10) showFeedback(id, '✅ 具体的な情報が伝わりやすくなります', 'tip');
  else hideFeedback(id);
}
function onIdeaInput() {
  updateProgress();
  const v = getVal('q10');
  const count = document.getElementById('ideaCharCount');
  if (count) count.textContent = `${v.length}文字`;
  if (v.length >= 20) {
    showFeedback('q10', '✅ しっかりと伝わります。このまま続けてください。', 'tip');
  } else if (v.length >= 5) {
    showFeedback('q10', 'もう少し具体的に書いてもらえると、実現に向けやすくなります', 'warn');
  } else {
    hideFeedback('q10');
  }
}

// ============================================================
//  テキスト生成（q11削除・アンケート削除）
// ============================================================
function buildText() {
  const q6v  = getQ6Values();
  const q9v  = getQ9Values();
  const q12v = getQ12Values();
  const ideaTypes = getIdeaTypes();
  const endTime = new Date();
  const diffMs  = startTime ? endTime - startTime : 0;
  const mins    = Math.floor(diffMs / 60000);
  const secs    = Math.floor((diffMs % 60000) / 1000);
  const elapsed = startTime ? `${mins}分${secs}秒` : '不明';

  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '　医療をよくするアイデア提案フォーム　',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '【基本情報】',
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
    '',
    '【C：今の対応とその限界】',
    `現在の対応　　　　：${getVal('q8') || '（未記入）'}`,
    `うまくいっていない点：${q9v.length ? q9v.join(' / ') : '特になし'}`,
    '',
    '【I：アイデア・ひらめき】',
    `アイデア内容　：${getVal('q10') || '（未記入）'}`,
    `アイデアの形　：${ideaTypes.length ? ideaTypes.join(' / ') : '（未選択）'}`,
    `具体イメージ　：${getVal('q10_detail') || '（未記入）'}`,
    `参考にしたもの：${getVal('q10_ref') || '（未記入）'}`,
    `懸念・課題　　：${getVal('q10_concern') || '（未記入）'}`,
    '',
    '【O：期待できる効果】',
    `期待される改善：${q12v.join(' / ') || '（未選択）'}`,
    `改善の規模感　：${getVal('q13') || '（未記入）'}`,
    '',
    `添付写真・資料：${capturedPhotos.length > 0 ? capturedPhotos.map(p => p.name).join(', ') : 'なし'}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `送信日時　　　　：${endTime.toLocaleString('ja-JP')}`,
    `レポート作成時間：${elapsed}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];
  return lines.join('\n');
}

// ============================================================
//  プレビュー
// ============================================================
function showPreview() {
  const errs = STEP_REQUIRED[4]();
  if (errs.length > 0) {
    alert('入力内容を確認してください：\n\n' + errs.join('\n'));
    return;
  }
  document.getElementById('previewText').textContent = buildText();
  const idea     = getVal('q10');
  const who      = getQ4Value();
  const freq     = getRadio('q5');
  const outcomes = getQ12Values();
  if (idea && who && outcomes.length > 0) {
    const picoText = [
      `<b>P</b>（対象・背景）：${who}が${freq}`,
      `<b>I</b>（介入・アイデア）：${idea.slice(0,120)}${idea.length>120?'…':''}`,
      `<b>C</b>（比較・現状）：${getVal('q8') || '現在の対応'}`,
      `<b>O</b>（期待する成果）：${outcomes.join('、')}`
    ].join('<br><br>');
    document.getElementById('picoContent').innerHTML = picoText;
    document.getElementById('picoBox').style.display = 'block';
  } else {
    document.getElementById('picoBox').style.display = 'none';
  }
  document.getElementById('previewModal').classList.add('active');
}

function closePreviewModal() {
  document.getElementById('previewModal').classList.remove('active');
}

// ============================================================
//  アクション：内容をコピー
// ============================================================
function actionCopy() {
  const text = buildText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => alert('✅ 内容をクリップボードにコピーしました。'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    alert('✅ 内容をクリップボードにコピーしました。');
  } catch (e) {
    alert('コピーに失敗しました。手動でコピーしてください。');
  }
  document.body.removeChild(ta);
}

// ============================================================
//  アクション：フォルダに保存（テキストファイルダウンロード）
// ============================================================
function actionSaveToFolder() {
  const text = buildText();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const now  = new Date();
  const ts   = now.toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
  const name = getVal('q2') || '匿名';
  const filename = `アイデア提案_${name}_${ts}.txt`;
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
//  アクション：メールで送信
// ============================================================
function actionSendMail() {
  document.getElementById('mailModal').classList.add('active');
}
function closeMailModal() {
  document.getElementById('mailModal').classList.remove('active');
}
function doSendMail() {
  const to = document.getElementById('mailTo').value.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    alert('有効なメールアドレスを入力してください。');
    return;
  }
  const text    = buildText();
  const name    = getVal('q2') || '（未記入）';
  const dept    = getVal('q1') || '';
  const subject = `${name}${dept ? '【' + dept + '】' : ''}のアイデア提案`;
  const mailtoUrl =
    'mailto:' + encodeURIComponent(to) +
    '?subject=' + encodeURIComponent(subject) +
    '&body='    + encodeURIComponent(text);
  window.location.href = mailtoUrl;
  closeMailModal();
}

// ============================================================
//  アクション：PDFで保存
// ============================================================
function actionSavePDF() {
  // 印刷ダイアログを使ってPDF保存 or 印刷
  // プレビューテキストを印刷用ページに渡す
  const text = buildText();
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。');
    return;
  }
  printWin.document.write(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>アイデア提案</title>
<style>
  body { font-family: "Noto Sans JP", sans-serif; font-size: 13px; padding: 30px; color: #222; }
  pre  { white-space: pre-wrap; word-break: break-all; line-height: 1.8; }
  h1   { font-size: 16px; border-bottom: 2px solid #4caf88; padding-bottom: 6px; margin-bottom: 16px; }
</style>
</head>
<body>
<h1>Medical Innovation Triage — アイデア提案</h1>
<pre>${text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
</body>
</html>`);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => { printWin.print(); }, 400);
}

// ============================================================
//  アクション：分析（medical_device_idea_2 に内容を渡す）
// ============================================================
function actionAnalyze() {
  const text = buildText();
  const targetUrl = 'https://morikawa001.github.io/medical_device_idea_2/';
  // テキストをsessionStorageに一時保存し、対象ページを開く
  try {
    sessionStorage.setItem('mit_idea_text', text);
  } catch(e) {}
  // URLにハッシュとしてエンコードして渡す（sessionStorageが使えない場合の補完）
  const encoded = encodeURIComponent(text);
  // 対象ページを新しいタブで開く
  const win = window.open(targetUrl, '_blank');
  // 対象ページがロードされたらテキストを貼り付けるメッセージを送信
  if (win) {
    const timer = setInterval(() => {
      try {
        win.postMessage({ type: 'mit_idea_paste', text: text }, targetUrl);
      } catch(e) {}
    }, 800);
    // 5秒後にタイマー停止
    setTimeout(() => clearInterval(timer), 5000);
  }
}

// 外部ページからのpostMessageを受信して貼り付けるリスナー（このページが受信する場合）
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'mit_idea_paste') {
    // テキストを入力欄に反映するハンドラ（このページ上で貼り付けが必要な場合）
    const ta = document.querySelector('textarea') || document.getElementById('q10');
    if (ta && event.data.text) {
      ta.value = event.data.text;
    }
  }
});

// ============================================================
//  リセット・再提案
// ============================================================
function resetForm() {
  document.getElementById('ideaForm').reset();
  document.querySelectorAll('.field-fb').forEach(el => {
    el.className = 'field-fb'; el.textContent = '';
  });
  document.querySelectorAll('.card-radio, .card-check, .freq-card, .icon-check').forEach(lbl => {
    lbl.classList.remove('selected');
  });
  document.querySelectorAll('.other-input-wrap').forEach(w => {
    w.classList.remove('show');
    const ta = w.querySelector('textarea');
    if (ta) ta.value = '';
  });
  document.querySelectorAll('input[name="q10_type"]').forEach(r => r.checked = false);

  // 写真リセット
  capturedPhotos.length = 0;
  const area = document.getElementById('photoPreviewArea');
  if (area) area.innerHTML = '';
  closeCamera();

  const charCount = document.getElementById('ideaCharCount');
  if (charCount) charCount.textContent = '0文字';

  const previewBtn = document.querySelector('.btn-preview');
  if (previewBtn) {
    previewBtn.disabled = false;
    previewBtn.classList.remove('btn-grayed');
  }
  startTime = null;
  showFormUI();
  document.getElementById('endScreen').classList.remove('active');
  showStep(0);
  updateProgress();
}

// ============================================================
//  終了画面
// ============================================================
function showEndScreen() {
  hideFormUI();
  document.getElementById('endScreen').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function restartFromEnd() {
  document.getElementById('endScreen').classList.remove('active');
  resetForm();
}

// ============================================================
//  初期化
// ============================================================
updateProgress();
