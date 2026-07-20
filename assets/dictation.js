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
  let attempts = 0;

  const controls = document.createElement('div');
  controls.className = 'dictation-controls';
  controls.innerHTML = `
    <button class="play-btn" type="button">▶ 聞く</button>
    <button class="play-btn play-btn--slow" type="button">▶ ゆっくり</button>
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
  const speak = (speed) => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = 'en-US';
    utterance.rate = speed;
    speechSynthesis.speak(utterance);
  };

  controls.querySelectorAll('.play-btn')[0].addEventListener('click', () => speak(rate));
  controls.querySelectorAll('.play-btn')[1].addEventListener('click', () => speak(0.55));

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
        '<strong>正解。</strong> ' + (note ? note.innerHTML : ''),
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
