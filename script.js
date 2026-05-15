// ============================================================
// MIT ヒアリングフォーム v3.6 — script.js（完全修正版）
// ============================================================

// デフォルト送信先
const DEFAULT_MAIL_TO = 'ns.morizo@gmail.com';

let startTime = null;

// ============================================================
// 音声入力（Web Speech API）
// ============================================================
let currentRecognition = null;
let currentMicBtn = null;
let currentTargetId = null;
let interimSpan = null;

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

  const ta = document.getElementById(targetId);
  const btn =
    document.querySelector(`[data-mic-target="${targetId}"]`) ||
    document.querySelector(`button[onclick*="startVoice('${targetId}')"]`) ||
    document.querySelector(`button[onclick*='startVoice("${targetId}")']`);

  const status = document.getElementById('voiceStatus');

  const recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  currentRecognition = recognition;
  currentMicBtn = btn;
  currentTargetId = targetId;

  if (btn) btn.classList.add('btn-mic--active');
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
    try {
      recognition.start();
    } catch (_) {
      stopVoiceUI();
    }
  };

  if (status) status.onclick = stopVoice;

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
  currentTargetId = null;

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
// UI ヘルパー
// ============================================================
const FORM_UI_IDS = ['picoRoadmap', 'progressWrap', 'navigator', 'ideaForm'];

function hideFormUI() {
  FORM_UI_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function showFormUI() {
  FORM_UI_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
}

// ============================================================
// ステップ管理
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

  document.querySelectorAll('.step-section').forEach((section, i) => {
    section.classList.toggle('active', i === step);
  });

  for (let i = 0; i < TOTAL_STEPS; i++) {
    const rm = document.getElementById(`rm${i}`);
    if (!rm) continue;

    rm.className = 'roadmap-step';
    if (i < step) rm.classList.add('done');
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

// 任意入力なので必須チェックは空
const STEP_REQUIRED = [() => [], () => [], () => [], () => [], () => []];

function goNext(step) {
  const errs = STEP_REQUIRED[step]();
  if (errs.length > 0) {
    alert('入力内容を確認してください：\n\n' + errs.join('\n'));
    return;
  }
  if (step < TOTAL_STEPS - 1) showStep(step + 1);
}

function goPrev(step) {
  if (step > 0) showStep(step - 1);
}

// ============================================================
// ユーティリティ
// ============================================================
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function getChecks(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(
    (e) => e.value
  );
}

function getQ3Value() {
  const v = getRadio('q3');
  if (!v) return '';
  return v === 'その他' ? `その他（${getVal('q3-other-text')}）` : v;
}

function getQ4Value() {
  const v = getRadio('q4');
  if (!v) return '';
  return v === 'その他' ? `その他（${getVal('q4-other-text')}）` : v;
}

function getQ6Values() {
  return getChecks('q6').map((v) =>
    v === 'その他' ? `その他（${getVal('q6-other-text')}）` : v
  );
}

function getQ9Values() {
  return getChecks('q9').map((v) =>
    v === 'その他' ? `その他（${getVal('q9-other-text')}）` : v
  );
}

function getQ12Values() {
  return getChecks('q12').map((v) =>
    v === 'その他' ? `その他（${getVal('q12-other-text')}）` : v
  );
}

function getIdeaTypes() {
  return getChecks('q10_type');
}

// ============================================================
// ステップ別進捗対象
// ============================================================
const STEP_ITEMS = {
  0: [
    () => getVal('q1'),
    () => getVal('q2'),
    () => getVal('q2b'),
    () => getQ3Value()
  ],
  1: [
    () => getQ4Value(),
    () => getRadio('q5'),
    () => (getQ6Values().length > 0 ? '1' : ''),
    () => getVal('q7')
  ],
  2: [
    () => getVal('q8'),
    () => (getQ9Values().length > 0 ? '1' : '')
  ],
  3: [
    () => getVal('q10'),
    () => (getIdeaTypes().length > 0 ? '1' : ''),
    () => getVal('q10_detail'),
    () => getVal('q10_ref'),
    () => getVal('q10_concern')
  ],
  4: [
    () => (getQ12Values().length > 0 ? '1' : ''),
    () => getVal('q13')
  ]
};

// ============================================================
// プログレスバー
// ============================================================
function updateProgress() {
  if (!startTime) startTime = new Date();

  const items = [
    getVal('q1'),
    getVal('q2'),
    getVal('q2b'),
    getQ3Value(),
    getQ4Value(),
    getRadio('q5'),
    getChecks('q6').length > 0 ? '1' : '',
    getVal('q7'),
    getVal('q8'),
    getQ9Values().length > 0 ? '1' : '',
    getVal('q10'),
    getChecks('q12').length > 0 ? '1' : '',
    getVal('q13')
  ];

  const filled = items.filter((v) => v !== '').length;
  const pct = Math.round((filled / items.length) * 100);

  const label = document.getElementById('progress-label');
  const pctEl = document.getElementById('progress-pct');
  const fill = document.getElementById('progressFill');

  if (label) {
    label.textContent =
      filled === 0
        ? '書きやすいところから少しずつ記録を始めてください'
        : `フォーム全体の ${filled} / ${items.length} ピースが記録済みです`;
  }
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (fill) fill.style.width = `${pct}%`;

  for (let step = 0; step <= 4; step++) {
    const defs = STEP_ITEMS[step];
    if (!defs) continue;

    const vals = defs.map((fn) => fn()).filter((v) => v !== '');
    const stepPct = Math.round((vals.length / defs.length) * 100);
    const panelEl = document.getElementById(`panelProgress${step}`);

    if (panelEl) {
      panelEl.textContent = `${stepPct}%`;
    }
  }
}

// ============================================================
// 入力イベント（HTML 側から引数なしで呼ぶ）
// ============================================================
function onSelectChange() {
  updateProgress();
}

function onTextInput() {
  updateProgress();
}

function onEmailInput() {
  updateProgress();
}

function onTextareaInput() {
  updateProgress();
}

function onIdeaInput() {
  updateProgress();
  updateIdeaCharCount();
}

// ============================================================
// ラジオ・チェックUI同期
// ============================================================
function onRadioChange(groupName) {
  if (groupName === 'q3') {
    syncCardRadio('q3');
    toggleOtherInputRadio('q3-other-check', 'q3-other-wrap');
  } else if (groupName === 'q4') {
    syncCardRadio('q4');
    toggleOtherInputRadio('q4-other-check', 'q4-other-wrap');
  } else if (groupName === 'q5') {
    syncFreqCards();
  }

  updateProgress();
}

function onCheckChange(groupId) {
  updateProgress();
  syncCardCheck(groupId);

  if (groupId === 'q6') {
    toggleOtherInput('q6-other-check', 'q6-other-wrap');
  } else if (groupId === 'q9') {
    toggleOtherInput('q9-other-check', 'q9-other-wrap');
  } else if (groupId === 'q12') {
    toggleOtherInput('q12-other-check', 'q12-other-wrap');
  }
}

function syncCardRadio(groupId) {
  const wrap = document.getElementById(groupId);
  if (!wrap) return;

  wrap.querySelectorAll('.card-radio').forEach((label) => {
    const input = label.querySelector('input[type="radio"]');
    label.classList.toggle('selected', !!input && input.checked);
  });
}

function syncCardCheck(groupId) {
  const wrap = document.getElementById(groupId);
  if (!wrap) return;

  wrap.querySelectorAll('.card-check').forEach((label) => {
    const input = label.querySelector('input[type="checkbox"]');
    label.classList.toggle('selected', !!input && input.checked);
  });
}

function syncFreqCards() {
  const group = document.getElementById('q5');
  if (!group) return;

  group.querySelectorAll('.freq-card').forEach((label) => {
    const input = label.querySelector('input[type="radio"]');
    label.classList.toggle('selected', !!input && input.checked);
  });
}

function toggleOtherInput(checkId, wrapId) {
  const chk = document.getElementById(checkId);
  const wrap = document.getElementById(wrapId);
  if (!chk || !wrap) return;
  wrap.classList.toggle('show', chk.checked);
}

function toggleOtherInputRadio(checkId, wrapId) {
  const chk = document.getElementById(checkId);
  const wrap = document.getElementById(wrapId);
  if (!chk || !wrap) return;
  wrap.classList.toggle('show', chk.checked);
}

function highlightChecked(groupName) {
  const wrap = document.getElementById(groupName);
  if (!wrap) return;

  wrap.querySelectorAll('.icon-check').forEach((label) => {
    const input = label.querySelector('input[type="checkbox"]');
    label.classList.toggle('selected', !!input && input.checked);
  });

  updateProgress();
}

function updateIdeaCharCount() {
  const ta = document.getElementById('q10');
  const cnt = document.getElementById('ideaCharCount');
  if (!ta || !cnt) return;

  const len = ta.value.length;
  cnt.textContent = `${len}文字`;
}

// ============================================================
// プレビュー用テキスト生成
// ============================================================
function buildText() {
  const q6v = getQ6Values();
  const q9v = getQ9Values();
  const q12v = getQ12Values();
  const ideaTypes = getIdeaTypes();

  const memoP = getVal('memo_p');
  const memoC = getVal('memo_c');
  const memoI = getVal('memo_i');
  const memoO = getVal('memo_o');

  const endTime = new Date();
  const diffMs = startTime ? endTime - startTime : 0;
  const elapsed = startTime
    ? `${Math.floor(diffMs / 60000)}分${Math.floor((diffMs % 60000) / 1000)}秒`
    : '不明';

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
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  ].join('\n');
}

// ============================================================
// プレビュー・各種アクション
// ============================================================
function showPreview() {
  const previewModal = document.getElementById('previewModal');
  const previewText = document.getElementById('previewText');
  if (!previewModal || !previewText) return;

  previewText.textContent = buildText();
  previewModal.classList.add('active');
}

function closePreviewModal() {
  const previewModal = document.getElementById('previewModal');
  if (previewModal) previewModal.classList.remove('active');
}

function actionSendMail() {
  const mailModal = document.getElementById('mailModal');
  const defDisp = document.getElementById('mailDefaultDisplay');

  if (mailModal && defDisp) {
    defDisp.textContent = DEFAULT_MAIL_TO;
    mailModal.classList.add('active');
  }
}

function closeMailModal() {
  const mailModal = document.getElementById('mailModal');
  if (mailModal) mailModal.classList.remove('active');
}

function onMailToInput() {
  // バリデーションを将来入れる場合用に空関数で確保
}

function doSendMail() {
  const extra = getVal('mailTo');
  const to = extra || DEFAULT_MAIL_TO;
  const body = encodeURIComponent(buildText());
  const subj = encodeURIComponent('MIT ヒアリング記録');
  const addr = encodeURIComponent(to);

  const url = `mailto:${addr}?subject=${subj}&body=${body}`;
  window.location.href = url;
}

function actionSaveToFolder() {
  alert('テキスト保存機能は、現状ブラウザ上ではクリップボードコピー等で代替してください。');
}

function actionSavePDF() {
  window.print();
}

function actionAnalyze() {
  alert('分析ページ連携は未実装です。');
}

// ============================================================
// ステップクリア・再スタート
// ============================================================
function clearStep(step) {
  if (!confirm('このステップの入力内容をクリアしますか？')) return;

  switch (step) {
    case 0:
      ['q1', 'q2', 'q2b'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      document.querySelectorAll('input[name="q3"]').forEach((el) => {
        el.checked = false;
      });
      {
        const otherText = document.getElementById('q3-other-text');
        const otherWrap = document.getElementById('q3-other-wrap');
        if (otherText) otherText.value = '';
        if (otherWrap) otherWrap.classList.remove('show');
      }
      break;

    case 1:
      ['q4-other-text', 'q6-other-text', 'q7', 'memo_p'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      ['q4', 'q5', 'q6'].forEach((name) => {
        document.querySelectorAll(`input[name="${name}"]`).forEach((el) => {
          el.checked = false;
        });
      });
      ['q4-other-wrap', 'q6-other-wrap'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('show');
      });
      break;

    case 2:
      ['q8', 'q9-other-text', 'memo_c'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      document.querySelectorAll('input[name="q9"]').forEach((el) => {
        el.checked = false;
      });
      {
        const w9 = document.getElementById('q9-other-wrap');
        if (w9) w9.classList.remove('show');
      }
      break;

    case 3:
      ['q10', 'q10_detail', 'q10_ref', 'q10_concern', 'memo_i'].forEach(
        (id) => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        }
      );
      document.querySelectorAll('input[name="q10_type"]').forEach((el) => {
        el.checked = false;
      });
      break;

    case 4:
      ['q12-other-text', 'q13', 'memo_o'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      document.querySelectorAll('input[name="q12"]').forEach((el) => {
        el.checked = false;
      });
      {
        const w12 = document.getElementById('q12-other-wrap');
        if (w12) w12.classList.remove('show');
      }
      break;
  }

  // 見た目の再同期
  syncCardRadio('q3');
  syncCardRadio('q4');
  syncFreqCards();
  syncCardCheck('q6');
  syncCardCheck('q9');
  syncCardCheck('q12');
  highlightChecked('q10_type');

  updateProgress();
}

function restartFromEnd() {
  const end = document.getElementById('endScreen');
  if (end) end.classList.remove('active');

  showFormUI();
  showStep(0);
  updateProgress();
}

// ============================================================
// 初期化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // ロードマップクリックでステップ移動
  document.querySelectorAll('.roadmap-step').forEach((stepEl) => {
    stepEl.style.cursor = 'pointer';
    stepEl.addEventListener('click', () => {
      const target = parseInt(stepEl.getAttribute('data-step'), 10);
      if (!isNaN(target)) showStep(target);
    });
  });

  // 中央パネルメニューからも移動
  document.querySelectorAll('.panel-main, .panel-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const step = parseInt(btn.getAttribute('data-step'), 10);
      if (!isNaN(step)) showStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // 初期状態同期
  syncCardRadio('q3');
  syncCardRadio('q4');
  syncFreqCards();
  syncCardCheck('q6');
  syncCardCheck('q9');
  syncCardCheck('q12');
  highlightChecked('q10_type');

  updateProgress();
  showStep(0);
});
