// ============================================================
//  MIT ヒアリングフォーム v3.2 — script.js
// ============================================================

let startTime = null;

// ============================================================
//  カメラ関連
// ============================================================
let cameraStream = null;
const capturedPhotos = []; // { dataUrl, name }

function openCamera() {
  const container = document.getElementById('cameraContainer');
  const video     = document.getElementById('cameraVideo');
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
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  const name    = `photo_${Date.now()}.jpg`;
  capturedPhotos.push({ dataUrl, name });
  addPhotoPreview(dataUrl, name, capturedPhotos.length - 1);
  closeCamera();
}

function addPhotoPreview(dataUrl, name, idx) {
  const area = document.getElementById('photoPreviewArea');
  const wrap = document.createElement('div');
  wrap.className  = 'photo-thumb';
  wrap.dataset.idx = String(idx);

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = name;
  wrap.appendChild(img);

  const del = document.createElement('button');
  del.type      = 'button';
  del.className = 'photo-thumb-del';
  del.textContent = '✕';
  del.onclick = () => {
    capturedPhotos[idx] = null; // null で論理削除（インデックスをずらさない）
    area.removeChild(wrap);
  };
  wrap.appendChild(del);
  area.appendChild(wrap);
}

// ============================================================
//  音声入力（Web Speech API）
// ============================================================
let currentRecognition = null;
let currentMicBtn      = null;

function startVoice(targetId) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert('このブラウザは音声入力に対応していません。\nChrome または Safari をお使いください。');
    return;
  }

  // 既に認識中なら停止
  if (currentRecognition) {
    currentRecognition.stop();
    return;
  }

  const ta    = document.getElementById(targetId);
  const btn   = document.querySelector(`[onclick="startVoice('${targetId}')"]`);
  const status = document.getElementById('voiceStatus');

  const recognition          = new SpeechRecognition();
  recognition.lang           = 'ja-JP';
  recognition.interimResults = true;
  recognition.continuous     = false;

  currentRecognition = recognition;
  currentMicBtn      = btn;

  if (btn) btn.classList.add('btn-mic--active');
  if (status) status.style.display = 'flex';

  // 認識開始時のカーソル位置を記録
  const startPos   = ta ? ta.selectionStart : 0;
  const baseText   = ta ? ta.value : '';
  let   interimEnd = startPos;

  recognition.onresult = (e) => {
    let interim  = '';
    let final    = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }

    if (ta) {
      // 確定テキストを挿入
      if (final) {
        const before = baseText.slice(0, startPos);
        const after  = baseText.slice(startPos);
        ta.value     = before + final + after;
        interimEnd   = startPos + final.length;
        updateProgress();
        // フォームのイベントを手動発火
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  recognition.onerror = (e) => {
    if (e.error !== 'aborted') {
      alert('音声認識エラー：' + e.error);
    }
    stopVoiceUI();
  };

  recognition.onend = () => {
    stopVoiceUI();
  };

  // ステータスをタップで停止
  if (status) {
    status.onclick = () => { recognition.stop(); };
  }

  recognition.start();
}

function stopVoiceUI() {
  currentRecognition = null;
  if (currentMicBtn) {
    currentMicBtn.classList.remove('btn-mic--active');
    currentMicBtn = null;
  }
  const status = document.getElementById('voiceStatus');
  if (status) status.style.display = 'none';
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
  'まず<strong>発案者の基本情報</strong>を確認・入力してください（すべて任意）。',
  '<strong>誰が、どのような場面で困っているか</strong>を発案者から聞き取り、記録してください。',
  '<strong>現在どのように対応しているか</strong>を発案者から聞き取り、記録してください。',
  '<strong>発案者のアイデア</strong>を聞き取り、できるだけ原文に忠実に記録してください。',
  'もう少しで完了です。<strong>このアイデアで何が変わりそうか</strong>を発案者とともに確認してください。'
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
//  バリデーション（すべて任意）
// ============================================================
const STEP_REQUIRED = [
  () => [], () => [], () => [], () => [], () => []
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
  return v === 'その他' ? (`その他（${getVal('q3-other-text')}）` || 'その他') : (v || '');
}
function getQ4Value() {
  const v = getRadio('q4');
  return v === 'その他' ? (`その他（${getVal('q4-other-text')}）` || 'その他') : (v || '');
}
function getQ6Values() {
  return getChecks('q6').map(v =>
    v === 'その他' ? (`その他（${getVal('q6-other-text')}）` || 'その他') : v);
}
function getQ9Values() {
  return getChecks('q9').map(v =>
    v === 'その他' ? (`その他（${getVal('q9-other-text')}）` || 'その他') : v);
}
function getQ12Values() {
  return getChecks('q12').map(v =>
    v === 'その他' ? (`その他（${getVal('q12-other-text')}）` || 'その他') : v);
}
function getIdeaTypes() { return getChecks('q10_type'); }

// ===== フィードバック =====
function showFeedback(id, msg, type) {
  const el = document.getElementById(`fb-${id}`);
  if (!el) return;
  el.textContent = msg;
  el.className   = `field-fb fb-${type} show`;
}
function hideFeedback(id) {
  const el = document.getElementById(`fb-${id}`);
  if (el) { el.className = 'field-fb'; el.textContent = ''; }
}
function highlightSelected(groupId) {
  document.querySelectorAll(`#${groupId} label`).forEach(lbl =>
    lbl.classList.toggle('selected', lbl.querySelector('input').checked));
}
function highlightChecked(groupId) {
  document.querySelectorAll(`#${groupId} label`).forEach(lbl =>
    lbl.classList.toggle('selected', lbl.querySelector('input').checked));
}
function toggleOtherInput(checkId, wrapId) {
  const checked = document.getElementById(checkId).checked;
  const wrap    = document.getElementById(wrapId);
  wrap.classList.toggle('show', checked);
  if (!checked) { const ta = wrap.querySelector('textarea'); if (ta) ta.value = ''; }
}
function toggleOtherInputRadio(radioId, wrapId) {
  const sel  = document.getElementById(radioId).checked;
  const wrap = document.getElementById(wrapId);
  wrap.classList.toggle('show', sel);
  if (!sel) { const ta = wrap.querySelector('textarea'); if (ta) ta.value = ''; }
}

// ============================================================
//  プログレスバー
// ============================================================
function updateProgress() {
  if (!startTime) startTime = new Date();
  const items = [
    getVal('q1'), getVal('q2'), getVal('q2b'), getQ3Value(), getQ4Value(),
    getRadio('q5'), getChecks('q6').length > 0 ? '1' : '',
    getVal('q7'), getVal('q8'), getQ9Values().length > 0 ? '1' : '0',
    getVal('q10'), getChecks('q12').length > 0 ? '1' : '', getVal('q13')
  ];
  const filled = items.filter(v => v !== '').length;
  const pct    = Math.round(filled / items.length * 100);
  const label  = document.getElementById('progress-label');
  const pctEl  = document.getElementById('progress-pct');
  const fill   = document.getElementById('progressFill');
  if (label) label.textContent = filled === 0 ? 'ヒアリングを開始してください' : `${filled} / ${items.length} 項目記録済み`;
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
  if (v) showFeedback(id, `✅ 「${v}」で記録します`, 'good');
  else   hideFeedback(id);
}
function onTextInput(id) {
  const v = getVal(id);
  if (!v) { hideFeedback(id); return; }
  if (v.length < 2) { showFeedback(id, 'フルネームでご記入ください', 'warn'); return; }
  showFeedback(id, `✅ ${v} さんの情報を記録します`, 'good');
}
function onEmailInput(id) {
  const v = getVal(id);
  if (!v) { hideFeedback(id); return; }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (ok) showFeedback(id, `✅ 「${v}」を記録しました`, 'good');
  else    showFeedback(id, '⚠️ メールアドレスの形式を確認してください', 'warn');
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
  if (v.length >= 10) showFeedback(id, '✅ 具体的な情報が記録されています', 'tip');
  else hideFeedback(id);
}
function onIdeaInput() {
  updateProgress();
  const v     = getVal('q10');
  const count = document.getElementById('ideaCharCount');
  if (count) count.textContent = `${v.length}文字`;
  if (v.length >= 20) showFeedback('q10', '✅ 内容が記録されています。', 'tip');
  else if (v.length >= 5) showFeedback('q10', 'さらに詳しく聞き取り、記録してください', 'warn');
  else hideFeedback('q10');
}

// ============================================================
//  テキスト生成
// ============================================================
function buildText() {
  const q6v       = getQ6Values();
  const q9v       = getQ9Values();
  const q12v      = getQ12Values();
  const ideaTypes = getIdeaTypes();
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
    `添付写真　　　：${capturedPhotos.filter(Boolean).length > 0
      ? capturedPhotos.filter(Boolean).map(p => p.name).join(', ') : 'なし'}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `記録日時　　　　　：${endTime.toLocaleString('ja-JP')}`,
    `ヒアリング所要時間：${elapsed}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

// ============================================================
//  プレビュー
// ============================================================
function showPreview() {
  document.getElementById('previewText').textContent = buildText();
  const idea     = getVal('q10');
  const who      = getQ4Value();
  const freq     = getRadio('q5');
  const outcomes = getQ12Values();
  if (idea && who && outcomes.length > 0) {
    document.getElementById('picoContent').innerHTML = [
      `<b>P</b>（対象・背景）：${who}が${freq}`,
      `<b>I</b>（介入・アイデア）：${idea.slice(0,120)}${idea.length>120?'…':''}`,
      `<b>C</b>（比較・現状）：${getVal('q8') || '現在の対応'}`,
      `<b>O</b>（期待する成果）：${outcomes.join('、')}`
    ].join('<br><br>');
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
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); alert('✅ コピーしました。'); }
  catch (e) { alert('コピーに失敗しました。手動でコピーしてください。'); }
  document.body.removeChild(ta);
}

// ============================================================
//  アクション：フォルダに保存
// ============================================================
function actionSaveToFolder() {
  const text     = buildText();
  const blob     = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const ts       = new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
  const filename = `ヒアリング記録_${getVal('q2') || '匿名'}_${ts}.txt`;
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
//  アクション：メールで送信（写真添付対応）
// ============================================================
function actionSendMail() {
  const photos = capturedPhotos.filter(Boolean);
  const note   = document.getElementById('photoAttachNote');
  const cnt    = document.getElementById('photoAttachCount');
  if (photos.length > 0 && note && cnt) {
    note.style.display = 'block';
    cnt.textContent    = photos.length;
  } else if (note) {
    note.style.display = 'none';
  }
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
  const subject = `ヒアリング記録：${name}${dept ? '【' + dept + '】' : ''}のアイデア提案`;
  const photos  = capturedPhotos.filter(Boolean);

  if (photos.length > 0) {
    // 写真がある場合：HTMLメールとして新しいウィンドウで mailto を構成
    // mailto は添付をサポートしないため、写真をHTMLメール本文に base64 img として埋め込む
    const imgHtml = photos.map((p, i) =>
      `<p><strong>写真${i+1}：${p.name}</strong></p>` +
      `<img src="${p.dataUrl}" style="max-width:480px;border-radius:6px;" alt="${p.name}">`
    ).join('<br>');

    const htmlBody =
      `<pre style="font-family:monospace;white-space:pre-wrap;">${
        text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      }</pre><hr><h3>📎 添付写真</h3>${imgHtml}`;

    // データURIのHTMLファイルをダウンロードし、メーラーで開く補助手段
    const blob = new Blob([`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
      <title>${subject}</title></head><body>${htmlBody}</body></html>`],
      { type: 'text/html;charset=utf-8' });
    const fileUrl = URL.createObjectURL(blob);

    // まず通常のmailtoで本文テキストを送信
    const mailtoUrl =
      'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) +
      '&body='    + encodeURIComponent(
        text + '\n\n※ 写真はHTMLファイルとして別途ダウンロードされます。'
      );
    window.location.href = mailtoUrl;

    // 写真入りHTMLもダウンロード
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = `ヒアリング記録_写真付き_${getVal('q2') || '匿名'}.html`;
      a.click();
      URL.revokeObjectURL(fileUrl);
    }, 800);

  } else {
    // 写真なし：通常のmailto
    const mailtoUrl =
      'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) +
      '&body='    + encodeURIComponent(text);
    window.location.href = mailtoUrl;
  }

  closeMailModal();
}

// ============================================================
//  アクション：PDFで保存
// ============================================================
function actionSavePDF() {
  const text     = buildText();
  const photos   = capturedPhotos.filter(Boolean);
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。');
    return;
  }
  const imgSection = photos.length > 0
    ? '<hr><h2>📎 添付写真</h2>' + photos.map((p,i) =>
        `<p><strong>写真${i+1}：${p.name}</strong></p>` +
        `<img src="${p.dataUrl}" style="max-width:100%;border-radius:6px;" alt="${p.name}">`
      ).join('<br>')
    : '';

  printWin.document.write(`<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>ヒアリング記録</title>
<style>
  body { font-family:"Noto Sans JP",sans-serif; font-size:13px; padding:30px; color:#222; }
  pre  { white-space:pre-wrap; word-break:break-all; line-height:1.8; }
  h1   { font-size:16px; border-bottom:2px solid #4caf88; padding-bottom:6px; margin-bottom:16px; }
  img  { page-break-inside: avoid; }
</style></head><body>
<h1>Medical Innovation Triage — ヒアリング記録</h1>
<pre>${text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
${imgSection}
</body></html>`);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => { printWin.print(); }, 400);
}

// ============================================================
//  アクション：分析
// ============================================================
function actionAnalyze() {
  const text      = buildText();
  const targetUrl = 'https://morikawa001.github.io/medical_device_idea_2/';
  const win       = window.open(targetUrl, '_blank');
  if (win) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      try { win.postMessage({ type: 'mit_idea_paste', text }, '*'); } catch (e) {}
      if (attempts >= 20) clearInterval(timer);
    }, 500);
  } else {
    actionCopy();
    alert('ポップアップがブロックされました。\n内容をクリップボードにコピーしました。\n分析ページを手動で開いて貼り付けてください。');
  }
}

// ============================================================
//  アクション：終了
// ============================================================
function actionEnd() {
  if (confirm('ヒアリングを終了しますか？\n入力内容は消去されます。')) {
    closePreviewModal();
    window.close();
    setTimeout(() => { resetForm(); showEndScreen(); }, 300);
  }
}

// ============================================================
//  リセット
// ============================================================
function resetForm() {
  document.getElementById('ideaForm').reset();
  document.querySelectorAll('.field-fb').forEach(el => { el.className = 'field-fb'; el.textContent = ''; });
  document.querySelectorAll('.card-radio, .card-check, .freq-card, .icon-check').forEach(lbl => lbl.classList.remove('selected'));
  document.querySelectorAll('.other-input-wrap').forEach(w => {
    w.classList.remove('show');
    const ta = w.querySelector('textarea'); if (ta) ta.value = '';
  });
  document.querySelectorAll('input[name="q10_type"]').forEach(r => r.checked = false);

  // 写真リセット
  capturedPhotos.length = 0;
  const area = document.getElementById('photoPreviewArea');
  if (area) area.innerHTML = '';
  closeCamera();

  const charCount = document.getElementById('ideaCharCount');
  if (charCount) charCount.textContent = '0文字';

  startTime = null;
  showFormUI();
  document.getElementById('endScreen').classList.remove('active');
  showStep(0);
  updateProgress();
}

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
