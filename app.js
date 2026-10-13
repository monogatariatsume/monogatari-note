(() => {
  'use strict';
  const STORAGE_KEY = 'monogatari-note-records-v1';
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  const form = document.querySelector('#entry-form');
  const recordsNode = document.querySelector('#records');
  const countNode = document.querySelector('#record-count');
  const emptyNode = document.querySelector('#empty-state');
  const noResultsNode = document.querySelector('#no-results');
  const titleInput = document.querySelector('#title-input');
  const genreInput = document.querySelector('#genre-input');
  const dateInput = document.querySelector('#date-input');
  const imageInput = document.querySelector('#image-input');
  const memoInput = document.querySelector('#memo-input');
  const idInput = document.querySelector('#record-id');
  const imagePreview = document.querySelector('#image-preview');
  const imagePreviewImg = imagePreview.querySelector('img');
  const storageError = document.querySelector('#storage-error');
  let records = loadRecords();
  let currentFilter = 'すべて';
  let selectedImage = '';
  let removeExistingImage = false;

  function loadRecords() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.filter(item => item && typeof item.id === 'string') : [];
    } catch (error) {
      return [];
    }
  }

  function saveRecords(nextRecords) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
      records = nextRecords;
      storageError.textContent = '';
      return true;
    } catch (error) {
      storageError.textContent = '保存できませんでした。画像を小さくするか、ブラウザーの保存容量を確認してください。';
      return false;
    }
  }

  function formatDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || '';
    const [year, month, day] = value.split('-');
    return `${year}年${Number(month)}月${Number(day)}日`;
  }

  function makeCard(record) {
    const card = document.createElement('article');
    card.className = 'record-card';
    const imageArea = document.createElement('div');
    imageArea.className = 'card-image';
    if (record.image) {
      const img = document.createElement('img');
      img.src = record.image;
      img.alt = `${record.title}の画像`;
      imageArea.append(img);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'image-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = '✿';
      imageArea.append(placeholder);
    }
    const badge = document.createElement('span');
    badge.className = 'genre-badge';
    badge.textContent = record.genre;
    imageArea.append(badge);

    const body = document.createElement('div');
    body.className = 'card-body';
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = record.title;
    const date = document.createElement('p');
    date.className = 'card-date';
    date.textContent = `見た日：${formatDate(record.date)}`;
    const memo = document.createElement('p');
    memo.className = 'card-memo';
    memo.textContent = record.memo || '感想はまだありません。';
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'card-action'; edit.textContent = '編集';
    edit.addEventListener('click', () => beginEdit(record.id));
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'card-action delete'; remove.textContent = '削除';
    remove.addEventListener('click', () => deleteRecord(record.id));
    actions.append(edit, remove);
    body.append(title, date, memo, actions);
    card.append(imageArea, body);
    return card;
  }

  function render() {
    const sort = document.querySelector('#sort-select').value;
    const visible = records.filter(record => currentFilter === 'すべて' || record.genre === currentFilter);
    visible.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ja') : sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
    recordsNode.replaceChildren(...visible.map(makeCard));
    countNode.textContent = `${records.length} 件`;
    emptyNode.hidden = records.length > 0;
    noResultsNode.hidden = records.length === 0 || visible.length > 0;
  }

  function clearErrors() {
    ['title', 'genre', 'date', 'image'].forEach(name => { document.querySelector(`#${name}-error`).textContent = ''; });
    [titleInput, genreInput, dateInput, imageInput].forEach(input => input.removeAttribute('aria-invalid'));
  }

  function validate() {
    clearErrors();
    let valid = true;
    if (!titleInput.value.trim()) { document.querySelector('#title-error').textContent = '作品名を入力してください。'; titleInput.setAttribute('aria-invalid', 'true'); valid = false; }
    if (!['漫画', 'アニメ', '映画'].includes(genreInput.value)) { document.querySelector('#genre-error').textContent = 'ジャンルを選んでください。'; genreInput.setAttribute('aria-invalid', 'true'); valid = false; }
    if (!dateInput.value) { document.querySelector('#date-error').textContent = '見た日を選んでください。'; dateInput.setAttribute('aria-invalid', 'true'); valid = false; }
    return valid;
  }

  function resetForm() {
    form.reset(); idInput.value = ''; selectedImage = ''; removeExistingImage = false;
    imagePreview.hidden = true; imagePreviewImg.removeAttribute('src');
    document.querySelector('#form-title').textContent = '新しい作品を記録';
    document.querySelector('#save-button').textContent = '記録を保存する';
    document.querySelector('#cancel-edit').hidden = true;
    storageError.textContent = ''; clearErrors();
  }

  function beginEdit(id) {
    const record = records.find(item => item.id === id);
    if (!record) return;
    idInput.value = record.id; titleInput.value = record.title; genreInput.value = record.genre;
    dateInput.value = record.date; memoInput.value = record.memo || '';
    selectedImage = ''; removeExistingImage = false;
    if (record.image) { imagePreviewImg.src = record.image; imagePreview.hidden = false; }
    else { imagePreview.hidden = true; }
    document.querySelector('#form-title').textContent = '作品の記録を編集';
    document.querySelector('#save-button').textContent = '変更を保存する';
    document.querySelector('#cancel-edit').hidden = false;
    clearErrors();
    document.querySelector('#record-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    titleInput.focus({ preventScroll: true });
  }

  function deleteRecord(id) {
    const record = records.find(item => item.id === id);
    if (!record || !window.confirm(`「${record.title}」の記録を削除しますか？`)) return;
    const next = records.filter(item => item.id !== id);
    if (saveRecords(next)) render();
  }

  imageInput.addEventListener('change', () => {
    const file = imageInput.files && imageInput.files[0];
    document.querySelector('#image-error').textContent = '';
    imageInput.removeAttribute('aria-invalid');
    selectedImage = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      document.querySelector('#image-error').textContent = '画像ファイルを選んでください。別の画像を選び直してください。';
      imageInput.value = ''; imageInput.setAttribute('aria-invalid', 'true'); return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      document.querySelector('#image-error').textContent = '画像が2MBを超えています。容量を小さくしてから、別の画像を選んでください。';
      imageInput.value = ''; imageInput.setAttribute('aria-invalid', 'true'); return;
    }
    const reader = new FileReader();
    reader.onload = () => { selectedImage = String(reader.result); imagePreviewImg.src = selectedImage; imagePreview.hidden = false; };
    reader.onerror = () => { document.querySelector('#image-error').textContent = '画像を読み込めませんでした。別の画像を選んでください。'; };
    reader.readAsDataURL(file);
  });

  document.querySelector('#remove-image').addEventListener('click', () => {
    selectedImage = ''; removeExistingImage = true; imageInput.value = '';
    imagePreview.hidden = true; imagePreviewImg.removeAttribute('src');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validate()) return;
    const editing = Boolean(idInput.value);
    const existing = editing ? records.find(item => item.id === idInput.value) : null;
    const record = {
      id: editing ? idInput.value : (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      title: titleInput.value.trim(), genre: genreInput.value, date: dateInput.value,
      image: selectedImage || (removeExistingImage ? '' : existing?.image || ''), memo: memoInput.value.trim()
    };
    const next = editing ? records.map(item => item.id === record.id ? record : item) : [record, ...records];
    if (saveRecords(next)) { resetForm(); render(); document.querySelector('#library-title').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });

  document.querySelector('#cancel-edit').addEventListener('click', resetForm);
  document.querySelector('#sort-select').addEventListener('change', render);
  document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll('.filter-button').forEach(item => item.classList.toggle('active', item === button));
    render();
  }));
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
