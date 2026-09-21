/**
 * wordformation - Core Application Logic
 * Pure Vanilla JavaScript, fully client-side (GitHub Pages ready)
 */

(function () {
  'use strict';

  // Constants & Storage Keys
  const STORAGE_KEY = 'wordformation_words';
  const DEFAULT_WORDS = ['word', 'formation'];

  // DOM Elements
  const wordForm = document.getElementById('word-form');
  const wordInput = document.getElementById('word-input');
  const slotAEl = document.getElementById('word-a');
  const slotBEl = document.getElementById('word-b');
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
              const parts = item.trim().split(/[\s\u3000]+/).filter(w => w.length > 0);
              parts.forEach(part => {
                if (!sanitized.includes(part)) {
                  sanitized.push(part);
                }
              });
            }
          });
          words = sanitized.length > 0 ? sanitized : [...DEFAULT_WORDS];
          saveWords();
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load words from localStorage:', e);
    }
    // Fallback to default presets
    words = [...DEFAULT_WORDS];
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
   * Pick 2 distinct words randomly and update the Stage display
   * @param {string} [priorityA] - Preferred word for slot A (or one of the slots)
   * @param {string} [priorityB] - Preferred word for slot B
   */
  function rollStageWords(priorityA = null, priorityB = null) {
    if (words.length === 0) {
      currentWordA = '—';
      currentWordB = '—';
    } else if (words.length === 1) {
      currentWordA = words[0];
      currentWordB = '...';
    } else {
      let a, b;
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
    slotAEl.classList.add('word-pop');
    slotBEl.classList.add('word-pop');

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

    words.forEach(word => {
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
      saveWords();
      renderTagCloud();

      // If the deleted word was on the stage, re-roll stage words
      if (currentWordA === word || currentWordB === word) {
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
    const tokens = raw.trim().split(/[\s\u3000\t\r\n]+/).filter(w => w.length > 0);

    if (tokens.length === 0) {
      // 入力フォームが空の状態でEnterを押したら、組み合わせをランダムに更新（シャッフル）
      rollStageWords();
      wordInput.value = '';
      ensureInputFocus(true);
      return;
    }

    // 重複を除外したトークン一覧（入力順を保持）
    const uniqueTokens = [...new Set(tokens)];
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
      if (uniqueTokens.length === 1) {
        showToast(`「${uniqueTokens[0]}」はすでに登録されています`);
      } else {
        showToast('入力された言葉はすべて登録済みです');
      }
      rollStageWords(uniqueTokens[0], uniqueTokens[1] || null);
      wordInput.value = '';
      ensureInputFocus();
      return;
    }

    // 新しい言葉を配列の先頭に追加（入力順が左から並ぶよう配置）
    words.unshift(...newWords);
    saveWords();

    // 入力欄をクリアして即フォーカス維持
    wordInput.value = '';
    ensureInputFocus(true);

    // タグクラウドを再描画
    renderTagCloud();

    // ステージを更新（2つ以上新規登録されたら、その新語同士を優先表示）
    if (newWords.length >= 2) {
      rollStageWords(newWords[0], newWords[1]);
      showToast(`${newWords.length} 語を登録しました`);
    } else {
      rollStageWords(newWords[0]);
    }
  }

  /**
   * Reset words to default initial presets ('word', 'formation')
   */
  function handleReset() {
    words = [...DEFAULT_WORDS];
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
    btnReset.addEventListener('click', handleReset);
    combinedPreview.addEventListener('click', handleCopy);

    // Keep input focused when clicking on background empty spaces (desktop only)
    document.addEventListener('click', (e) => {
      if (isTouchDevice()) return;
      if (
        !e.target.closest('button') && 
        !e.target.closest('input') && 
        !e.target.closest('.combined-preview')
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
