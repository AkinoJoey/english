/* 共通の読み上げ音声部品 — 全レッスンの音声出力をここに集約する。
 *
 * 背景: speechSynthesis は OS 内蔵の声を使うが、macOS の既定の声（Samantha 等）は
 * ロボット的で、しかも「丁寧に読み上げる」ため flap /t/・弱形・dark L といった
 * 連結音声をほとんど作らない。このワークショップが教えている現象そのものが
 * 鳴らないので、声の選択は教材の正しさに直結する。
 *
 * 対策: 利用可能な声に得点をつけて最良のものを既定にし、ユーザーが差し替えられる
 * ようにする。選択は localStorage に保存し、全レッスンで共有する。
 *
 * 使い方:
 *   <script src="../assets/voice.js"></script>   ← 必ず他の部品より先に読む
 *   <div class="voice-picker"></div>             ← 置いた場所に選択 UI が出る
 *
 * 他の部品からは window.LessonVoice.speak(text, rate) を呼ぶ。
 */

window.LessonVoice = (() => {
  const STORE_KEY = 'lesson-voice';
  const supported = 'speechSynthesis' in window;
  let voices = [];
  let chosen = null;

  /* 名前から品質を推定する。SpeechSynthesisVoice は品質を公開しないため、
   * 既知の高品質シリーズ名で近似するしかない。
   * 参考: https://github.com/HadrienGardeur/web-speech-recommended-voices */
  const score = (voice) => {
    const name = voice.name.toLowerCase();
    let points = 0;
    if (voice.lang.startsWith('en')) points += 10;
    if (voice.lang === 'en-US') points += 5;
    if (!voice.localService) points += 8; // Google のネットワーク音声。最も自然
    if (name.includes('google')) points += 8;
    if (name.includes('siri')) points += 7;
    if (name.includes('premium')) points += 6;
    if (name.includes('enhanced')) points += 4;
    if (name.includes('natural')) points += 4;
    /* 明らかなノベルティ音声を落とす（macOS の Bells, Bubbles, Zarvox 等） */
    if (/bells|bubbles|zarvox|trinoids|whisper|bad news|good news|jester|organ|cellos|boing|wobble/.test(name)) {
      points -= 50;
    }
    return points;
  };

  const load = () => {
    if (!supported) return;
    voices = speechSynthesis
      .getVoices()
      .filter((v) => v.lang.startsWith('en'))
      .sort((a, b) => score(b) - score(a));
    if (!voices.length) return;
    const saved = localStorage.getItem(STORE_KEY);
    chosen = voices.find((v) => v.name === saved) || voices[0];
    document.querySelectorAll('.voice-picker').forEach(render);
  };

  const speak = (text, rate = 1) => {
    if (!supported) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    if (chosen) utterance.voice = chosen;
    speechSynthesis.speak(utterance);
  };

  const render = (host) => {
    if (!supported || !voices.length) {
      host.innerHTML = '<p class="voice-note">この環境では音声を再生できません。</p>';
      return;
    }
    host.innerHTML = `
      <label class="voice-label">読み上げの声</label>
      <select class="voice-select">
        ${voices
          .map(
            (v) =>
              `<option value="${v.name}"${v === chosen ? ' selected' : ''}>` +
              `${v.name}（${v.lang}${v.localService ? '' : ' · ネットワーク'}）</option>`
          )
          .join('')}
      </select>
      <button class="play-btn voice-test" type="button">▶ 試す</button>
      <p class="voice-note">
        <strong>不自然に感じたら変えてください。</strong>
        上位ほど自然な傾向です（<span class="phrase">Google</span> や
        <span class="phrase">Siri</span> を含む声、ネットワーク音声）。選択は保存されます。
      </p>
    `;
    const select = host.querySelector('.voice-select');
    select.addEventListener('change', () => {
      chosen = voices.find((v) => v.name === select.value) || chosen;
      localStorage.setItem(STORE_KEY, chosen.name);
      document.querySelectorAll('.voice-select').forEach((other) => {
        other.value = chosen.name;
      });
      speak('What it does is it validates the payload.', 1);
    });
    host
      .querySelector('.voice-test')
      .addEventListener('click', () => speak('What it does is it validates the payload.', 1));
  };

  if (supported) {
    load();
    /* Chrome では getVoices() が初回に空を返し、非同期で埋まる */
    speechSynthesis.addEventListener('voiceschanged', load);
  } else {
    document.addEventListener('DOMContentLoaded', () =>
      document.querySelectorAll('.voice-picker').forEach(render)
    );
  }

  return { speak, get: () => chosen, list: () => voices };
})();
