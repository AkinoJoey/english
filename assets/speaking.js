/* 共通スピーキング部品 — 産出の練習に、自動フィードバックループを与える。
 *
 * ディクテーション（聞く→打つ）に対して、こちらは 聞く→言う→判定 のループ。
 * ブラウザ内蔵の SpeechRecognition で発話を文字化し、目標文と照合する。
 *
 * 使い方:
 *   <div class="speaking" data-target="What I recommend you do is"
 *                         data-budget="1.1">
 *     <p class="speaking-note">判定後に出す解説（HTML 可）</p>
 *   </div>
 *
 * data-budget は「この秒数以内に言い切る」目標（省略時は判定しない）。
 * 産出の核心は語を並べることではなく圧縮することなので、時間も評価対象にする。
 *
 * SpeechRecognition は Chrome 系でのみ動き、認識にネットワークを使う。
 * 非対応・不許可の場合は自己採点チェックリストに退避する（練習は続行できる）。
 */

(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const tidy = (text) =>
    text
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[.,!?;:"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  /* 語単位の一致率。認識器は言い直しや冠詞を落とすことがあるので、
   * 完全一致ではなく含有率で見る。 */
  const overlap = (heard, target) => {
    const want = tidy(target).split(' ');
    const got = tidy(heard).split(' ');
    const pool = [...got];
    let hit = 0;
    want.forEach((w) => {
      const at = pool.indexOf(w);
      if (at !== -1) {
        hit += 1;
        pool.splice(at, 1);
      }
    });
    return { ratio: hit / want.length, missing: want.filter((w) => !got.includes(w)) };
  };

  document.querySelectorAll('.speaking').forEach((item) => {
    const target = item.dataset.target;
    const budget = Number(item.dataset.budget || 0);
    const note = item.querySelector('.speaking-note');

    const controls = document.createElement('div');
    controls.className = 'speaking-controls';
    controls.innerHTML = `
      <p class="speaking-target">${target}</p>
      <div class="speaking-actions">
        <button class="play-btn speaking-model" type="button">▶ お手本</button>
        <button class="play-btn speaking-model-slow" type="button">▶ ゆっくり</button>
        <button class="speaking-rec" type="button">🎤 言ってみる</button>
      </div>
      <p class="speaking-feedback"></p>
    `;
    item.prepend(controls);

    const feedback = controls.querySelector('.speaking-feedback');
    const recBtn = controls.querySelector('.speaking-rec');

    /* 音声出力は assets/voice.js に集約している */
    const say = (rate) => window.LessonVoice && window.LessonVoice.speak(target, rate);
    controls.querySelector('.speaking-model').addEventListener('click', () => say(1));
    controls.querySelector('.speaking-model-slow').addEventListener('click', () => say(0.6));

    const settle = (html, state) => {
      feedback.innerHTML = html;
      feedback.className = `speaking-feedback shown ${state}`;
    };

    const revealNote = () => (note ? `<br>${note.innerHTML}` : '');

    /* --- 退避経路: 認識が使えない環境 --- */
    if (!SR) {
      recBtn.textContent = '自己採点';
      recBtn.addEventListener('click', () => {
        settle(
          '<strong>このブラウザは音声認識に非対応です。</strong> お手本を聞き、' +
            '声に出してから、以下を自分で確認してください。' +
            '<ul><li>枠の部分を、内容部分より<strong>速く・平坦に</strong>言えたか</li>' +
            '<li>強い音節を<strong>指定の数だけ</strong>立てたか</li>' +
            '<li>途中で止まらず<strong>一息</strong>で言い切れたか</li></ul>' +
            revealNote(),
          'revealed'
        );
      });
      return;
    }

    /* --- 通常経路: 認識で判定する --- */
    let running = false;

    recBtn.addEventListener('click', () => {
      if (running) return;
      running = true;

      const recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      let startedAt = 0;
      let elapsed = 0;
      let heard = '';

      recognition.addEventListener('speechstart', () => {
        startedAt = performance.now();
      });
      recognition.addEventListener('speechend', () => {
        if (startedAt) elapsed = (performance.now() - startedAt) / 1000;
      });

      recognition.addEventListener('result', (event) => {
        /* 候補のうち目標に最も近いものを採る。認識器の第一候補は
         * 言語モデルに引きずられて勝手に整形されることがあるため。 */
        const alts = [...event.results[0]].map((a) => a.transcript);
        heard = alts.reduce((best, alt) =>
          overlap(alt, target).ratio > overlap(best, target).ratio ? alt : best
        );
      });

      recognition.addEventListener('error', (event) => {
        running = false;
        recBtn.textContent = '🎤 言ってみる';
        settle(
          event.error === 'not-allowed'
            ? 'マイクの使用が許可されていません。アドレスバーのマイク設定を確認してください。'
            : `認識できませんでした（${event.error}）。もう一度試してください。`,
          'wrong'
        );
      });

      recognition.addEventListener('end', () => {
        running = false;
        recBtn.textContent = '🎤 言ってみる';
        if (!heard) return;

        const { ratio, missing } = overlap(heard, target);
        const pct = Math.round(ratio * 100);
        const time = elapsed ? `${elapsed.toFixed(1)}秒` : '計測不可';
        const inBudget = budget && elapsed && elapsed <= budget;

        const lines = [
          `<strong>認識された発話:</strong> <span class="phrase">${heard}</span>`,
          `<strong>語の一致:</strong> ${pct}%` +
            (missing.length ? `（落ちた語: <span class="phrase">${missing.join(', ')}</span>）` : ''),
        ];
        if (budget) {
          lines.push(
            `<strong>所要時間:</strong> ${time} ／ 目標 ${budget}秒以内 ` +
              (inBudget ? '✓' : '— まだ伸びています')
          );
        }

        if (ratio >= 0.85 && (!budget || inBudget)) {
          settle(`<strong>合格。</strong><br>${lines.join('<br>')}${revealNote()}`, 'correct');
        } else if (ratio >= 0.85) {
          settle(
            `<strong>語は言えています。あとは速さです。</strong><br>${lines.join('<br>')}` +
              '<br>枠の部分は情報を運ばないので、<strong>潰して構いません</strong>。もう一度、お手本の速さで。',
            'wrong'
          );
        } else {
          settle(
            `${lines.join('<br>')}<br>お手本をもう一度聞いて、` +
              '<strong>落ちた語を意識せず、リズムごと真似て</strong>ください。',
            'wrong'
          );
        }
      });

      recBtn.textContent = '● 録音中…';
      settle('話してください。', 'listening');
      recognition.start();
    });
  });
})();
