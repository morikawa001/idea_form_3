// ============================================================
//  MIT ヒアリングフォーム v3.6 — script.js（放射状メニュー対応）
// ============================================================

const DEFAULT_MAIL_TO = 'ns.morizo@gmail.com';
let startTime = null;

// ============================================================
//  音声入力（Web Speech API）
// ============================================================
let currentRecognition = null;
let currentMicBtn      = null;
let currentTargetId    = null;
let interimSpan        = null;

function startVoice(targetId) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert('このブラウザは音声入力に対応していません。\nChrome または Edge をお使いください。');
    return;
  }

  if (currentRecognition) {
    stopVoice();
    return;
  }

  const ta  = document.getElementById(targetId);
  const btn = document.querySelector(`[data-mic-target="${targetId}"]`) ||
              document.querySelector(`button[onclick*="startVoice('${targetId}')"]`) ||
              document.querySelector(`button[onclick*='startVoice("${targetId}")']`);

  const status = document.getElementById('voiceStatus');

  const recognition            = new SpeechRecognition();
  recognition.lang             = 'ja-JP';
  recognition.interimResults   = true;
  recognition.continuous       = true;
  recognition.maxAlternatives  = 1;

  currentRecognition = recognition;
  currentMicBtn      = btn;
  currentTargetId    = targetId;

  if (btn)    btn.classList.add('btn-mic--active');
  if (status) status.style.display = 'flex';

  if (ta) {
    if (interimSpan) interimSpan.remove();
    interimSpan = document.createElement('div');
    interimSpan.id = 'voiceInterim';
    interimSpan.style.cssText =
      'font-size:0.8em;color:#888;min-height:1.2em;padding:2px 4px;margin-top:2px;';
    const wrap = ta.parentNode;
    wrap.parentNode.insertBefore(interimSpan, wrap.nextSibling);
  }

  const baseText = ta ? ta.value : '';
  const startPos = ta ? ta.selectionStart ?? ta.value.length : 0;

  recognition.onresult = (e) => {
    let interim = '';
    let finalText = '';

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalText += transcript;
      } else {
        interim += transcript;
      }
    }

    if (interimSpan) {
      interimSpan.textContent = interim ? `🎤 ${interim}` : '';
    }

    if (finalText && ta) {
      ta.value = baseText + (ta.value.slice(baseText.length) || '') + finalText;
      if (interimSpan) interimSpan.textContent = '';
      updateProgress();
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  recognition.onerror = (e) => {
    if (e.error === 'aborted') return;
    if (e.error === 'no-speech') {
      try { recognition.stop(); } catch (_) {}
      return;
    }
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      alert('マイクへのアクセスが拒否されています。\nブラウザのアドレスバー左のマイクアイコンから許可してください。');
    } else {
      alert('音声認識エラー：' + e.error);
    }
    if (currentRecognition === recognition) stopVoiceUI();
  };

  recognition.onend = () => {
    if (currentRecognition !== recognition) return;
    try { recognition.start(); } catch (_) { stopVoiceUI(); }
  };

  if (status) {
    status.onclick = stopVoice;
  }

  try {
    recognition.start();
  } catch (e) {
    alert('音声認識を開始できませんでした：' + e.message);
    stopVoiceUI();
  }
}

function stopVoice() {
  const rec = currentRecognition;
  stopVoiceUI();
  if (rec) {
    try { rec.abort(); } catch (_) {}
  }
}

function stopVoiceUI() {
  currentRecognition = null;
  currentTargetId    = null;
  if (currentMicBtn) {
    currentMicBtn.classList.remove('btn-mic--active');
    currentMicBtn = null;
  }
  if (interimSpan) {
    interimSpan.remove();
    interimSpan = null;
  }
  const status = document.getElementById('voiceStatus');
  if (status) {
    status.style.display = 'none';
    status.onclick = null;
  }
}

// ============================================================
//  UI ヘルパー
// ============================================================
const FORM_UI_IDS = ['picoRoadmap', 'progressWrap', 'navigator', 'ideaForm'];

function hideFormUI() {
  FORM_UI_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}
function showFormUI() {
  FORM_UI_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
}

// ============================================================
//  ステップ管理
// ============================================================
let currentStep = 0;
const TOTAL_STEPS = 5;

const NAV_MESSAGES = [
  '発案者の基本情報を確認・入力してください（すべて任意）。',
  '誰が・どのような場面で困っているかを発案者から聞き取り、記録してください。',
  '現在どのように対応しているかを発案者から聞き取り、記録してください。',
  '発案者のアイデアを聞き取り、できるだけ原文に忠実に記録してください。',
  'このアイデアで何が変わりそうかを発案者と一緒に確認してください。'
];

function showStep(step) {
  stopVoice();
  document.querySelectorAll('.step-section').forEach((s, i) => s.classList.toggle('active', i === step));

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

const STEP_REQUIRED = [ () => [], () => [], () => [], () => [], () => [] ];

function goNext(step) {
  const errs = STEP_REQUIRED[step]();
  if (errs.length > 0) { alert('入力内容を確認してください：\n\n' + errs.join('\n')); return; }
  showStep(step + 1);
}
function goPrev(step) { showStep(step - 1); }

// ============================================================
//  ユーティリティ
// ============================================================
function getVal(id)    { return (document.getElementById(id) || { value: '' }).value.trim(); }
function getRadio(nm)  { const el = document.querySelector(`input[name="${nm}"]:checked`); return el ? el.value : ''; }
function getChecks(nm) { return [...document.querySelectorAll(`input[name="${nm}"]:checked`)].map(e => e.value); }

function getQ3Value()  { const v = getRadio('q3');  return v === 'その他' ? `その他（${getVal('q3-other-text')}）`  : (v || ''); }
function getQ4Value()  { const v = getRadio('q4');  return v === 'その他' ? `その他（${getVal('q4-other-text')}）`  : (v || ''); }
function getQ6Values() { return getChecks('q6').map(v  => v === 'その他' ? `その他（${getVal('q6-other-text')}）`  : v); }
function getQ9Values() { return getChecks('q9').map(v  => v === 'その他' ? `その他（${getVal('q9-other-text')}）`  : v); }
function getQ12Values(){ return getChecks('q12').map(v => v === 'その他' ? `その他（${getVal('q12-other-text')}）` : v); }
function getIdeaTypes(){ return getChecks('q10_type'); }

// ===== フィードバック =====
function showFeedback(id, msg, type) {
  const el = document.getElementById(`fb-${id}`);
  if (!el) return;
  el.textContent = msg; el.className = `field-fb fb-${type} show`;
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
  if (label) label.textContent =
    filled === 0
      ? '書きやすいところから少しずつ記録を始めてください'
      : `フォーム全体の ${filled} / ${items.length} ピースが記録済みです`;
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
  if (v) showFeedback(id, `✅ 「${v}」で記録します`, 'good'); else hideFeedback(id);
}
function onTextInput(id) {
  const v = getVal(id);
  if (!v) { hideFeedback(id); return; }
  if (id === 'q2' && v.length < 2) {
    showFeedback(id, 'フルネームでご記入ください', 'warn');
    return;
  }
  showFeedback(id, `✅ 「${v}」を記録します`, 'good');
}
function onEmailInput(id) {
  const v  = getVal(id);
  if (!v) { hideFeedback(id); return; }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (ok) showFeedback(id, `✅ 「${v}」を記録しました`, 'good');
  else    showFeedback(id, '⚠️ メールアドレスの形式を確認してください', 'warn');
}
function onRadioChange(groupId) {
  highlightSelected(groupId); updateProgress();
  const v = getRadio(groupId);
  if (v) showFeedback(groupId, `✅ 「${v}」を選択しました`, 'good');
}
function onCheckChange(groupId) {
  highlightChecked(groupId); updateProgress();
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
  if (v.length >= 20)     showFeedback('q10', '✅ 内容が記録されています。', 'tip');
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
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `記録日時　　　　　：${endTime.toLocaleString('ja-JP')}`,
    `ヒアリング所要時間：${elapsed}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

// ============================================================
//  プレビューなど（元ファイルと同じ）
// ============================================================
// ※ ここから下は、元の idea_form_3_script_js_0515-3.txt の
//    showPreview / actionCopy / actionSaveToFolder / actionSendMail /
//    actionSavePDF / actionAnalyze / actionEnd / resetForm / clearStep などを
//    そのまま続けてください（内容変更なし）。

// ・・・（元ファイルの残りをそのまま貼り付け）・・・


// ============================================================
//  ロードマップ + 放射状メニュー クリックナビ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // 上部ロードマップ（そのまま）
  document.querySelectorAll('.roadmap-step').forEach(stepEl => {
    stepEl.style.cursor = 'pointer';
    stepEl.addEventListener('click', () => {
      const target = parseInt(stepEl.getAttribute('data-step'), 10);
      if (!isNaN(target)) showStep(target);
    });
  });

  // 中央パズルメニュー（基本情報＋周囲4ピース）
  document.querySelectorAll('.puzzle-center, .puzzle-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseInt(btn.getAttribute('data-step'), 10);
      if (!isNaN(step)) showStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // 初期表示
  updateProgress();
  showStep(0);
});
