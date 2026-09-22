/**
 * wordformation - Core Application Logic
 * Pure Vanilla JavaScript, fully client-side (GitHub Pages ready)
 */

(function () {
  'use strict';

  // Constants & Storage Keys
  const STORAGE_KEY = 'wordformation_words';
  const DEFAULT_WORDS = ['word', 'formation'];
  const MAX_WORD_LENGTH = 32;       // 1単語の最大文字数
  const MAX_WORDS_PER_SUBMIT = 500; // 一度に登録できる最大単語数

  // DOM Elements
  const wordForm = document.getElementById('word-form');
  const wordInput = document.getElementById('word-input');
  const slotAEl = document.getElementById('word-a');
  const slotBEl = document.getElementById('word-b');
  const pinBtnA = document.getElementById('pin-btn-a');
  const pinBtnB = document.getElementById('pin-btn-b');
  const connectorIcon = document.getElementById('connector-icon');
  const combinedPreview = document.getElementById('combined-preview');
  const combinedText = document.getElementById('combined-text');
  const copyHint = document.getElementById('copy-hint');
  const tagCloud = document.getElementById('tag-cloud');
  const wordCountEl = document.getElementById('word-count');
  const btnReset = document.getElementById('btn-reset');
  const toastEl = document.getElementById('toast');

  // State
  let words = [];
  let currentWordA = '';
  let currentWordB = '';
  let pinnedSlot = null; // 'a' | 'b' | null（排他的ピン留め）

  /**
   * Initialize Application
   */
  function init() {
    loadWords();
    renderAll();
    setupEventListeners();
    ensureInputFocus();
  }

  /**
   * Sort words array in natural alphabetical / syllabary order (A-Z, あ-ん)
   * @param {string[]} list
   * @returns {string[]}
   */
  function sortWords(list) {
    return [...list].sort((a, b) => {
      return a.localeCompare(b, ['ja', 'en'], {
        sensitivity: 'base',
        numeric: true,
      });
    });
  }

  /**
   * Load words from localStorage or initialize with defaults
   */
  function loadWords() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // スペースが含まれる単語が過去に入っていた場合は個別に分解して登録
          const sanitized = [];
          parsed.forEach(item => {
            if (typeof item === 'string') {
              const parts = item.trim().split(/[\s\u3000]+/).filter(w => w.length > 0 && w.length <= MAX_WORD_LENGTH);
              parts.forEach(part => {
                if (!sanitized.includes(part)) {
                  sanitized.push(part);
                }
              });
            }
          });
          words = sanitized.length > 0 ? sortWords(sanitized) : sortWords([...DEFAULT_WORDS]);
          saveWords();
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load words from localStorage:', e);
    }
    // Fallback to default presets
    words = sortWords([...DEFAULT_WORDS]);
    saveWords();
  }

  /**
   * Save words to localStorage
   */
  function saveWords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  /**
   * Toggle Pin (lock) state for slot A or B (Mutually exclusive: only one can be pinned)
   * @param {'a' | 'b'} slot
   */
  function togglePinSlot(slot) {
    if (words.length === 0) return;
    if (slot === 'a' && (!currentWordA || currentWordA === '—')) return;
    if (slot === 'b' && (!currentWordB || currentWordB === '—' || currentWordB === '...')) return;

    // 同じスロットを押したら解除、違うスロットを押したらそちらに切り替え
    if (pinnedSlot === slot) {
      pinnedSlot = null;
    } else {
      pinnedSlot = slot;
    }
    updatePinDOM();
    ensureInputFocus();
  }

  /**
   * Update Pin Button UI states
   */
  function updatePinDOM() {
    if (pinBtnA) {
      const isA = pinnedSlot === 'a';
      pinBtnA.classList.toggle('is-pinned', isA);
      pinBtnA.setAttribute('title', isA ? '言葉aの固定を解除 (Pin ON)' : '言葉aを固定 (Pin OFF)');
      pinBtnA.setAttribute('aria-pressed', isA ? 'true' : 'false');
    }
    if (pinBtnB) {
      const isB = pinnedSlot === 'b';
      pinBtnB.classList.toggle('is-pinned', isB);
      pinBtnB.setAttribute('title', isB ? '言葉bの固定を解除 (Pin ON)' : '言葉bを固定 (Pin OFF)');
      pinBtnB.setAttribute('aria-pressed', isB ? 'true' : 'false');
    }
  }

  /**
   * Pick 2 distinct words randomly and update the Stage display
   * @param {string} [priorityA] - Preferred word for slot A (or one of the slots)
   * @param {string} [priorityB] - Preferred word for slot B
   */
  function rollStageWords(priorityA = null, priorityB = null) {
    if (words.length === 0) {
      currentWordA = '—';
      currentWordB = '—';
      pinnedSlot = null;
      updatePinDOM();
    } else if (words.length === 1) {
      currentWordA = words[0];
      currentWordB = '...';
      pinnedSlot = null;
      updatePinDOM();
    } else {
      let a, b;
      if (pinnedSlot === 'a' && words.includes(currentWordA)) {
        // 言葉aが固定されている場合
        a = currentWordA;
        const remaining = words.filter(w => w !== a);
        if (priorityB && remaining.includes(priorityB)) {
          b = priorityB;
        } else if (priorityA && remaining.includes(priorityA) && priorityA !== a) {
          b = priorityA;
        } else {
          b = remaining[Math.floor(Math.random() * remaining.length)];
        }
      } else if (pinnedSlot === 'b' && words.includes(currentWordB)) {
        // 言葉bが固定されている場合
        b = currentWordB;
        const remaining = words.filter(w => w !== b);
        if (priorityA && remaining.includes(priorityA)) {
          a = priorityA;
        } else if (priorityB && remaining.includes(priorityB) && priorityB !== b) {
          a = priorityB;
        } else {
          a = remaining[Math.floor(Math.random() * remaining.length)];
        }
      } else {
        // ピン留めなし、あるいは固定されていた単語が削除されていた場合
        if (pinnedSlot !== null) {
          pinnedSlot = null;
          updatePinDOM();
        }

        if (priorityA && priorityB && priorityA !== priorityB && words.includes(priorityA) && words.includes(priorityB)) {
          a = priorityA;
          b = priorityB;
        } else if (priorityA && words.includes(priorityA)) {
          const remaining = words.filter(w => w !== priorityA);
          const partner = remaining[Math.floor(Math.random() * remaining.length)];
          const putInA = Math.random() < 0.5;
          a = putInA ? priorityA : partner;
          b = putInA ? partner : priorityA;
        } else {
          const idxA = Math.floor(Math.random() * words.length);
          let idxB = Math.floor(Math.random() * (words.length - 1));
          if (idxB >= idxA) idxB++;
          a = words[idxA];
          b = words[idxB];
        }
      }
      currentWordA = a;
      currentWordB = b;
    }

    updateStageDOM();
  }

  /**
   * Update Stage DOM with animations
   */
  function updateStageDOM() {
    // Reset and trigger CSS pop animation
    slotAEl.classList.remove('word-pop');
    slotBEl.classList.remove('word-pop');
    void slotAEl.offsetWidth; // force reflow
    void slotBEl.offsetWidth;

    slotAEl.textContent = currentWordA;
    slotBEl.textContent = currentWordB;
    
    // 固定されているスロットはポップアニメーションをスキップ
    if (pinnedSlot !== 'a') {
      slotAEl.classList.add('word-pop');
    }
    if (pinnedSlot !== 'b') {
      slotBEl.classList.add('word-pop');
    }

    // Subtle connector spin
    if (connectorIcon) {
      connectorIcon.classList.toggle('spin');
    }

    // Update combined text
    if (currentWordA && currentWordB && currentWordA !== '—' && currentWordB !== '...') {
      combinedText.textContent = `${currentWordA}${currentWordB}`;
      combinedPreview.style.visibility = 'visible';
    } else if (currentWordA && currentWordA !== '—') {
      combinedText.textContent = currentWordA;
      combinedPreview.style.visibility = 'visible';
    } else {
      combinedText.textContent = '...';
      combinedPreview.style.visibility = 'hidden';
    }

    highlightActiveTags();
  }

  /**
   * Swap words between slot A and slot B (triggered by clicking the '+' connector)
   */
  let connectorRotation = 0;
  function swapStageWords() {
    if (
      words.length < 2 || 
      !currentWordA || 
      !currentWordB || 
      currentWordA === '—' || 
      currentWordB === '...' || 
      currentWordB === '—'
    ) {
      return;
    }

    // 単語を入れ替え
    const temp = currentWordA;
    currentWordA = currentWordB;
    currentWordB = temp;

    // 固定（ピン留め）されている場合、ピン留めスロットも単語に合わせて追従
    if (pinnedSlot === 'a') {
      pinnedSlot = 'b';
    } else if (pinnedSlot === 'b') {
      pinnedSlot = 'a';
    }
    updatePinDOM();

    // コネクタアイコンをクルッと回転
    connectorRotation += 180;
    if (connectorIcon) {
      connectorIcon.style.transform = `rotate(${connectorRotation}deg)`;
    }

    // スワップ時のポップアニメーション
    slotAEl.classList.remove('word-pop');
    slotBEl.classList.remove('word-pop');
    void slotAEl.offsetWidth; // force reflow
    void slotBEl.offsetWidth;

    slotAEl.textContent = currentWordA;
    slotBEl.textContent = currentWordB;
    slotAEl.classList.add('word-pop');
    slotBEl.classList.add('word-pop');

    // 結合プレビューの更新
    combinedText.textContent = `${currentWordA}${currentWordB}`;
    combinedPreview.style.visibility = 'visible';

    highlightActiveTags();
    ensureInputFocus();
  }

  /**
   * Highlight tags that are currently featured in the stage
   */
  function highlightActiveTags() {
    const tagElements = tagCloud.querySelectorAll('.word-tag');
    tagElements.forEach(tag => {
      const w = tag.getAttribute('data-word');
      if (w === currentWordA || w === currentWordB) {
        tag.classList.add('is-active');
      } else {
        tag.classList.remove('is-active');
      }
    });
  }

  /**
   * Render the Tag Cloud
   */
  function renderTagCloud() {
    tagCloud.innerHTML = '';
    if (wordCountEl) {
      wordCountEl.textContent = `${words.length} 語`;
    }

    if (words.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'cloud-empty-msg';
      emptyMsg.textContent = '登録された言葉がありません。上のフォームから言葉を入力してください。';
      tagCloud.appendChild(emptyMsg);
      return;
    }

    // A to Z、あいうえお順に整然とソートして表示
    const sortedList = sortWords(words);

    sortedList.forEach(word => {
      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'word-tag';
      tag.setAttribute('data-word', word);
      tag.setAttribute('title', `クリックして「${word}」を削除`);
      tag.textContent = word;

      if (word === currentWordA || word === currentWordB) {
        tag.classList.add('is-active');
      }

      // Instant delete on click without confirmation
      tag.addEventListener('click', (e) => {
        e.preventDefault();
        deleteWord(word, tag);
      });

      tagCloud.appendChild(tag);
    });
  }

  /**
   * Delete a word instantly with animation
   */
  function deleteWord(word, tagElement) {
    tagElement.classList.add('is-leaving');

    setTimeout(() => {
      words = words.filter(w => w !== word);

      // 言葉aと言葉bが無くなったら（登録単語が0語になったら）初期化してリロード
      if (words.length === 0) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
        location.reload();
        return;
      }

      saveWords();
      renderTagCloud();

      // If the deleted word was on the stage, re-roll stage words
      if (currentWordA === word || currentWordB === word) {
        if ((pinnedSlot === 'a' && currentWordA === word) || (pinnedSlot === 'b' && currentWordB === word)) {
          pinnedSlot = null;
          updatePinDOM();
        }
        rollStageWords();
      }

      // Always maintain focus on input for typing rhythm
      ensureInputFocus();
    }, 160);
  }

  /**
   * Add new word(s) from the input (supports space-separated multiple words)
   */
  function handleAddWord(e) {
    e.preventDefault();
    const raw = wordInput.value;
    // 半角スペース・全角スペース・タブ・改行等で確実に分割
    let rawTokens = raw.trim().split(/[\s\u3000\t\r\n]+/).filter(w => w.length > 0);

    if (rawTokens.length === 0) {
      // 入力フォームが空の状態でEnterを押したら、組み合わせをランダムに更新（シャッフル）
      rollStageWords();
      wordInput.value = '';
      ensureInputFocus(true);
      return;
    }

    // 一度に登録できる単語数は最大500語まで
    let exceededMaxWords = false;
    if (rawTokens.length > MAX_WORDS_PER_SUBMIT) {
      rawTokens = rawTokens.slice(0, MAX_WORDS_PER_SUBMIT);
      exceededMaxWords = true;
    }

    // 1単語の最大文字数は32文字まで（32文字以下の単語のみ有効）
    let hasOverlengthWord = false;
    const validTokens = [];
    rawTokens.forEach(t => {
      if (t.length <= MAX_WORD_LENGTH) {
        validTokens.push(t);
      } else {
        hasOverlengthWord = true;
      }
    });

    if (validTokens.length === 0) {
      showToast(`言葉は1単語${MAX_WORD_LENGTH}文字以内で入力してください`);
      wordInput.value = '';
      ensureInputFocus();
      return;
    }

    // 重複を除外したトークン一覧（入力順を保持）
    const uniqueTokens = [...new Set(validTokens)];
    const newWords = [];
    const existingWords = [];

    uniqueTokens.forEach(token => {
      if (words.includes(token)) {
        existingWords.push(token);
      } else {
        newWords.push(token);
      }
    });

    if (newWords.length === 0) {
      // すべて登録済みの場合
      let msg = uniqueTokens.length === 1
        ? `「${uniqueTokens[0]}」はすでに登録されています`
        : '入力された言葉はすべて登録済みです';
      if (hasOverlengthWord) {
        msg += `（${MAX_WORD_LENGTH}文字超の言葉は除外されました）`;
      }
      showToast(msg);

      if (pinnedSlot === 'a') {
        rollStageWords(null, uniqueTokens[0]);
      } else if (pinnedSlot === 'b') {
        rollStageWords(uniqueTokens[0], null);
      } else {
        rollStageWords(uniqueTokens[0], uniqueTokens[1] || null);
      }
      wordInput.value = '';
      ensureInputFocus();
      return;
    }

    // 新しい言葉を追加し、A-Z・五十音順に綺麗にソート
    words = sortWords([...words, ...newWords]);
    saveWords();

    // 入力欄をクリアして即フォーカス維持
    wordInput.value = '';
    ensureInputFocus(true);

    // タグクラウドを再描画
    renderTagCloud();

    // ステージを更新
    if (pinnedSlot === 'a') {
      rollStageWords(null, newWords[0]);
    } else if (pinnedSlot === 'b') {
      rollStageWords(newWords[0], null);
    } else if (newWords.length >= 2) {
      rollStageWords(newWords[0], newWords[1]);
    } else {
      rollStageWords(newWords[0]);
    }

    // トースト通知（語数、上限・文字数オーバー時の注記）
    let toastMsg = '';
    if (exceededMaxWords) {
      toastMsg = `先頭${MAX_WORDS_PER_SUBMIT}語のうち ${newWords.length} 語を登録しました`;
    } else if (newWords.length >= 2) {
      toastMsg = `${newWords.length} 語を登録しました`;
    }
    if (hasOverlengthWord) {
      toastMsg += toastMsg ? `（${MAX_WORD_LENGTH}文字超は除外）` : `${MAX_WORD_LENGTH}文字を超える言葉は除外されました`;
    }
    if (toastMsg) {
      showToast(toastMsg);
    }
  }

  /**
   * Reset words to default initial presets ('word', 'formation')
   */
  function handleReset() {
    pinnedSlot = null;
    updatePinDOM();
    words = sortWords([...DEFAULT_WORDS]);
    saveWords();
    renderAll();
    ensureInputFocus();
  }

  /**
   * Copy the combined coined word to clipboard
   */
  let copyResetTimer = null;
  async function handleCopy() {
    const textToCopy = combinedText.textContent;
    if (!textToCopy || textToCopy === '...') return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers / webviews
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      // トースト通知を出さず、バッジ内の文字がさりげなく「copied」に切り替わる
      const copySpan = copyHint ? copyHint.querySelector('span') : null;
      if (copySpan) {
        copySpan.textContent = 'copied';
        if (copyResetTimer) clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(() => {
          copySpan.textContent = 'copy';
        }, 1100);
      }
    } catch (err) {
      console.warn('Copy failed:', err);
    }
    ensureInputFocus();
  }

  /**
   * Show temporary toast message
   */
  let toastTimeout = null;
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2000);
  }

  /**
   * Render everything
   */
  function renderAll() {
    rollStageWords();
    renderTagCloud();
  }

  /**
   * Detect touch device to handle virtual software keyboard elegantly
   */
  function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  }

  /**
   * Ensure the input is focused for uninterrupted rhythm on desktop,
   * while preventing unwelcome virtual keyboard popups on mobile.
   * @param {boolean} [force=false] - Force focus even on touch devices (e.g. right after submit)
   */
  function ensureInputFocus(force = false) {
    if (isTouchDevice() && !force) {
      return;
    }
    requestAnimationFrame(() => {
      wordInput.focus();
    });
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    wordForm.addEventListener('submit', handleAddWord);
    if (btnReset) btnReset.addEventListener('click', handleReset);
    combinedPreview.addEventListener('click', handleCopy);
    if (connectorIcon) connectorIcon.addEventListener('click', swapStageWords);
    if (pinBtnA) pinBtnA.addEventListener('click', () => togglePinSlot('a'));
    if (pinBtnB) pinBtnB.addEventListener('click', () => togglePinSlot('b'));

    // Keep input focused when clicking on background empty spaces (desktop only)
    document.addEventListener('click', (e) => {
      if (isTouchDevice()) return;
      if (
        !e.target.closest('button') && 
        !e.target.closest('input') && 
        !e.target.closest('.combined-preview') &&
        !e.target.closest('.pin-btn')
      ) {
        ensureInputFocus();
      }
    });

    // Refocus when desktop window gains focus
    window.addEventListener('focus', () => {
      if (!isTouchDevice()) ensureInputFocus();
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
