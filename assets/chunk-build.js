/* 意味の積み上げ練習 — 一息の句を1つずつ提示し、句ごとに「今わかっている像」を
 * 作らせる。語を溜め込まず、到着順（英語の語順）に意味へ変換して統合する訓練。
 *
 * 「後半で前半を忘れる」「像が遅い」への対処。生の語を保持すると音韻ループ（約2秒）を
 * 溢れさせるが、句ごとに意味へ畳んで統合すれば、運ぶのは1つの育っていく像だけになる。
 * レッスン 10 の主部品。将来の聴解レッスンで再利用する。
 *
 * 使い方:
 *   <div class="chunk-build">
 *     <div class="chunk" data-say="What it does"
 *          data-gist="主語＋動詞だけ。中身は未定。『次に目的が来る』と待ち構える"></div>
 *     <div class="chunk" data-say="is it validates"
 *          data-gist="仕事は『検証』。何を？の枠がひとつ空く"></div>
 *     <div class="chunk" data-say="the payload"
 *          data-gist="ペイロードを検証する。像が閉じた"></div>
 *   </div>
 *
 * 各句は「▶ 次の句」で1つずつ開く。音声を鳴らし英語を表示する。像（data-gist）は
 * 伏せてあり「像は？」で開く —— 自分で像を作ってから照合する（retrieval）。
 * 全句を開くと「▶ 通しで聞く」が出る。積み上げた像を持ったまま自然速で聞き直す。
 */

document.querySelectorAll('.chunk-build').forEach((widget) => {
  const chunks = Array.from(widget.querySelectorAll('.chunk'));
  const rate = Number(widget.dataset.rate || 1.0);
  /* 音声出力は assets/voice.js に集約している（声の選択を全レッスンで共有するため） */
  const speak = (text, speed) =>
    window.LessonVoice && window.LessonVoice.speak(text, speed);

  /* 元のマークアップを退避し、段階提示できるよう作り直す */
  const specs = chunks.map((c) => ({ say: c.dataset.say, gist: c.dataset.gist }));
  chunks.forEach((c) => c.remove());

  const stack = document.createElement('div');
  stack.className = 'chunk-stack';

  const controls = document.createElement('div');
  controls.className = 'chunk-controls';
  controls.innerHTML = `
    <button class="play-btn chunk-next" type="button">▶ 次の句</button>
    <span class="chunk-count">0 / ${specs.length}</span>
  `;

  widget.append(stack, controls);

  const nextBtn = controls.querySelector('.chunk-next');
  const count = controls.querySelector('.chunk-count');
  let shown = 0;

  const revealChunk = () => {
    const spec = specs[shown];
    const row = document.createElement('div');
    row.className = 'chunk-row';
    row.innerHTML = `
      <div class="chunk-line">
        <button class="chunk-replay" type="button" title="もう一度">▶</button>
        <span class="chunk-text phrase">${spec.say}</span>
      </div>
      <button class="chunk-gist-btn" type="button">像は？</button>
      <p class="chunk-gist">${spec.gist}</p>
    `;
    stack.append(row);
    speak(spec.say, rate);

    row.querySelector('.chunk-replay')
      .addEventListener('click', () => speak(spec.say, rate));
    const gistBtn = row.querySelector('.chunk-gist-btn');
    const gist = row.querySelector('.chunk-gist');
    gistBtn.addEventListener('click', () => {
      gist.classList.add('shown');
      gistBtn.remove();
    });

    shown += 1;
    count.textContent = `${shown} / ${specs.length}`;

    if (shown >= specs.length) {
      nextBtn.textContent = '▶ 通しで聞く';
      nextBtn.classList.add('chunk-full');
      nextBtn.replaceWith(nextBtn.cloneNode(true)); // 旧リスナー除去
      const fullBtn = controls.querySelector('.chunk-next');
      const whole = specs.map((s) => s.say).join(' ');
      fullBtn.addEventListener('click', () => speak(whole, 1.0));
    }
  };

  nextBtn.addEventListener('click', revealChunk);
});
