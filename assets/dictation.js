/* 共通ディクテーション部品 — 聞いた文を打ち込ませる「自由再生」練習。
 *
 * 選択肢からの再認より負荷が高く、storage strength を作るのに適している。
 *
 * 使い方:
 *   <div class="dictation" data-answer="Can you take a look at it?" data-rate="0.9">
 *     <p class="dictation-hint" data-hint="ヒント（2回間違えると出る）"></p>
 *     <p class="dictation-note">正解後に出す解説（HTML 可）</p>
 *   </div>
 *
 * data-say を添えると、読み上げる文と正解を分けられる。段階ディクテーション
 * （同じ音声に対して「内容語だけ」→「全文」と2段階で答えさせる）に使う。
 *
 *   <div class="dictation" data-say="A couple of tools are available."
 *                          data-answer="tools available">
 *
 * data-cold を添えると「初見モード」になる。ゆっくり再生を封じ、再生回数を数えて
 * 表示する。実世界の聴取（巻き戻しが効かない）に条件を近づけるためのもので、
 * 何回で取れたかが自動性の指標になる。
 *
 *   <div class="dictation" data-cold data-answer="...">
 *
 * 再生ボタン・入力欄・判定ボタンは JS が生成する。
 * 判定は大文字小文字・句読点・連続空白・短縮形のアポストロフィを無視する。
 */

const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[.,!?;:"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

document.querySelectorAll('.dictation').forEach((item) => {
  const answer = item.dataset.answer;
  const spoken = item.dataset.say || answer;
  const rate = Number(item.dataset.rate || 0.9);
  const hint = item.querySelector('.dictation-hint');
  const note = item.querySelector('.dictation-note');
  const cold = item.hasAttribute('data-cold');
  let attempts = 0;
  let plays = 0;

  const controls = document.createElement('div');
  controls.className = 'dictation-controls';
  controls.innerHTML = `
    <button class="play-btn" type="button">▶ 聞く</button>
    ${cold
      ? '<span class="play-count">再生 0 回</span>'
      : '<button class="play-btn play-btn--slow" type="button">▶ ゆっくり</button>'}
    <input class="dictation-input" type="text" autocomplete="off" autocapitalize="off"
           spellcheck="false" placeholder="聞こえた文を入力">
    <div class="dictation-actions">
      <button class="dictation-check" type="button">判定</button>
      <button class="dictation-reveal" type="button">答えを見る</button>
    </div>
    <p class="dictation-feedback"></p>
  `;
  item.prepend(controls);

  const input = controls.querySelector('.dictation-input');
  const feedback = controls.querySelector('.dictation-feedback');
  /* 音声出力は assets/voice.js に集約している（声の選択を全レッスンで共有するため） */
  const speak = (speed) => window.LessonVoice && window.LessonVoice.speak(spoken, speed);

  const counter = controls.querySelector('.play-count');
  controls.querySelectorAll('.play-btn')[0].addEventListener('click', () => {
    plays += 1;
    if (counter) counter.textContent = `再生 ${plays} 回`;
    speak(rate);
  });
  const slowButton = controls.querySelector('.play-btn--slow');
  if (slowButton) slowButton.addEventListener('click', () => speak(0.55));

  const settle = (message, state) => {
    feedback.innerHTML = message;
    feedback.className = `dictation-feedback shown ${state}`;
  };

  const reveal = () => {
    input.value = answer;
    input.disabled = true;
    settle(
      `<strong>答え:</strong> <span class="phrase">${answer}</span>` +
        (note ? `<br>${note.innerHTML}` : ''),
      'revealed'
    );
    if (note) note.remove();
    if (hint) hint.classList.remove('shown');
  };

  const check = () => {
    if (input.disabled) return;
    if (normalize(input.value) === normalize(answer)) {
      input.disabled = true;
      settle(
        `<strong>正解。</strong>${cold ? `（再生 ${plays} 回）` : ''} ` +
          (note ? note.innerHTML : ''),
        'correct'
      );
      if (note) note.remove();
      return;
    }
    attempts += 1;
    if (attempts >= 2 && hint && hint.dataset.hint) {
      hint.textContent = `ヒント: ${hint.dataset.hint}`;
      hint.classList.add('shown');
    }
    settle(
      attempts >= 2
        ? 'まだ違います。もう一度ゆっくり再生して、機能語に注目してください。'
        : '違います。もう一度聞いてみてください。',
      'wrong'
    );
  };

  controls.querySelector('.dictation-check').addEventListener('click', check);
  controls.querySelector('.dictation-reveal').addEventListener('click', reveal);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') check();
  });
});
