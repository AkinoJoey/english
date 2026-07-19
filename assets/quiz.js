/* 共通クイズ部品 — 全レッスンで再利用する。
 *
 * 使い方:
 *   <div class="quiz" data-answer="1">
 *     <p class="quiz-prompt">問題文</p>
 *     <div class="quiz-options">
 *       <button class="quiz-option">選択肢A</button>
 *       <button class="quiz-option">選択肢B</button>
 *     </div>
 *     <p class="quiz-feedback" data-correct="正解時の解説" data-wrong="不正解時の解説"></p>
 *   </div>
 *
 * data-answer は 0 始まりの正解インデックス。
 * 即時フィードバックを返すため、回答後に選択肢をロックする。
 */

document.querySelectorAll('.quiz').forEach((quiz) => {
  const answer = Number(quiz.dataset.answer);
  const options = [...quiz.querySelectorAll('.quiz-option')];
  const feedback = quiz.querySelector('.quiz-feedback');

  options.forEach((option, index) => {
    option.addEventListener('click', () => {
      const isCorrect = index === answer;
      options.forEach((o, i) => {
        o.disabled = true;
        if (i === answer) o.classList.add('correct');
      });
      if (!isCorrect) option.classList.add('wrong');

      if (feedback) {
        const note = isCorrect ? feedback.dataset.correct : feedback.dataset.wrong;
        feedback.innerHTML =
          (isCorrect ? '<strong>正解。</strong> ' : '<strong>惜しい。</strong> ') + note;
        feedback.classList.add('shown');
      }
    });
  });
});

/* 音声再生 — ブラウザ内蔵の Web Speech API を使う（外部通信なし）。
 *
 * 使い方: <button class="play-btn" data-say="What are you doing?" data-rate="0.9">▶ 聞く</button>
 */

document.querySelectorAll('.play-btn[data-say]').forEach((button) => {
  if (!('speechSynthesis' in window)) {
    button.disabled = true;
    button.textContent = '（このブラウザは音声再生に非対応）';
    return;
  }
  button.addEventListener('click', () => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(button.dataset.say);
    utterance.lang = 'en-US';
    utterance.rate = Number(button.dataset.rate || 1);
    speechSynthesis.speak(utterance);
  });
});
