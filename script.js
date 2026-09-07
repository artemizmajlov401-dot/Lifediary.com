 // ===== ДАННЫЕ =====
const STORAGE_KEY = 'lifeDiaryEntries';
const USER_KEY = 'lifeDiaryUser';
const LOCK_DELAY = 60;
let entries = loadEntries();
let currentPage = 0;
const entriesPerPage = 2;
let currentFont = localStorage.getItem('lifeDiaryFont') || 'marck';
let currentRuler = localStorage.getItem('lifeDiaryRuler') || 'line';
let userData = loadUserData();
let pagePassword = localStorage.getItem('lifeDiaryPassword') || '';
let pendingUnlockId = null;

// ===== ЗВУКИ =====
function playSound(type) {
    try {
        const audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        let duration = 0.15,
            volume = 0.12,
            freq = 160;
        if (type === 'pageTurn') { duration = 0.2;
            volume = 0.1;
            freq = 120 } else if (type === 'bookOpen') { duration = 0.3;
            volume = 0.06;
            freq = 90 } else if (type === 'bookClose') { duration = 0.25;
            volume = 0.05;
            freq = 110 } else if (type === 'addPage') { duration = 0.1;
            volume = 0.15;
            freq = 200 } else if (type === 'lock') { duration = 0.12;
            volume = 0.1;
            freq = 250 } else if (type === 'settingsOpen') { duration = 0.1;
            volume = 0.08;
            freq = 300 } else if (type === 'settingsClose') { duration = 0.08;
            volume = 0.06;
            freq = 280 } else return;

        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            const decay = 1 - t * t;
            data[i] = (Math.random() * 2 - 1) * decay * 0.15;
        }
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = buffer;
        const osc = audioCtx.createOscillator();
        osc.frequency.value = freq;
        osc.type = 'sine';
        const gain = audioCtx.createGain();
        gain.gain.value = volume;
        const gain2 = audioCtx.createGain();
        gain2.gain.value = volume * 0.15;
        noiseSource.connect(gain);
        osc.connect(gain2);
        gain.connect(audioCtx.destination);
        gain2.connect(audioCtx.destination);
        noiseSource.start();
        osc.start();
        noiseSource.stop(now + duration);
        osc.stop(now + duration * 0.4);
    } catch (_) {}
}

function loadEntries() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveEntriesToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadUserData() {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
}

function saveUserData(data) {
    localStorage.setItem(USER_KEY, JSON.stringify(data));
}

// ===== ЭЛЕМЕНТЫ =====
const registerScreen = document.getElementById('registerScreen');
const mainScreen = document.getElementById('mainScreen');
const regName = document.getElementById('regName');
const regBirth = document.getElementById('regBirth');
const regCity = document.getElementById('regCity');
const registerBtn = document.getElementById('registerBtn');

const book = document.getElementById('book');
const cover = document.getElementById('cover');
const pagesContainer = document.getElementById('pagesContainer');
const pageLeft = document.getElementById('pageLeft');
const pageRight = document.getElementById('pageRight');
const pageInfo = document.getElementById('pageInfo');
const controls = document.getElementById('controls');
const addPageBtn = document.getElementById('addPageBtn');
const exportBtn = document.getElementById('exportBtn');

const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const profileName = document.getElementById('profileName');
const profileBirth = document.getElementById('profileBirth');
const profileCity = document.getElementById('profileCity');
const logoutBtn = document.getElementById('logoutBtn');
const fontSelect = document.getElementById('fontSelect');
const rulerBtns = document.querySelectorAll('.ruler-btn');
const passwordInput = document.getElementById('passwordInput');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const statTotal = document.getElementById('statTotal');
const statLocked = document.getElementById('statLocked');
const statOpen = document.getElementById('statOpen');
const resetDataBtn = document.getElementById('resetDataBtn');
const passwordStatus = document.getElementById('passwordStatus');

// ===== РАЗМЕР КНИГИ =====
const sizeSlider = document.getElementById('bookSizeSlider');
const sizeValue = document.getElementById('sizeValue');
const bookWrapper = document.getElementById('bookWrapper');

sizeSlider.addEventListener('input', function() {
    const val = this.value;
    sizeValue.textContent = val + '%';
    bookWrapper.style.width = val + 'vw';
    bookWrapper.style.height = (val * 0.9) + 'vh';
    localStorage.setItem('bookSize', val);
});

const savedSize = localStorage.getItem('bookSize') || '50';
sizeSlider.value = savedSize;
sizeValue.textContent = savedSize + '%';
bookWrapper.style.width = savedSize + 'vw';
bookWrapper.style.height = (savedSize * 0.9) + 'vh';

// ===== МОДАЛЬНЫЕ ОКНА =====
const addPageModal = document.getElementById('addPageModal');
const passwordModal = document.getElementById('passwordModal');
const noPasswordModal = document.getElementById('noPasswordModal');

addPageBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!pagePassword) {
        noPasswordModal.classList.add('active');
        return;
    }
    addPageModal.classList.add('active');
});

document.getElementById('closeAddModal').addEventListener('click', function() {
    addPageModal.classList.remove('active');
});
document.getElementById('cancelAddModal').addEventListener('click', function() {
    addPageModal.classList.remove('active');
});

document.querySelector('.modal-open-btn').addEventListener('click', function() {
    addPageModal.classList.remove('active');
    addNewPage(false);
});

document.querySelector('.modal-lock-btn').addEventListener('click', function() {
    addPageModal.classList.remove('active');
    addNewPage(true);
});

document.getElementById('closePasswordModal').addEventListener('click', function() {
    passwordModal.classList.remove('active');
    pendingUnlockId = null;
});
document.getElementById('customPasswordCancel').addEventListener('click', function() {
    passwordModal.classList.remove('active');
    pendingUnlockId = null;
});

document.getElementById('customPasswordConfirm').addEventListener('click', function() {
    const entered = document.getElementById('customPasswordInput').value.trim();
    if (entered === pagePassword && pendingUnlockId !== null) {
        const entry = entries.find(e => e.id === pendingUnlockId);
        if (entry) {
            entry.locked = false;
            saveEntriesToStorage();
            renderPages();
            alert('✅ Страница разблокирована!');
        }
        passwordModal.classList.remove('active');
        pendingUnlockId = null;
        document.getElementById('customPasswordInput').value = '';
    } else {
        alert('❌ Неверный пароль. Попробуйте снова.');
    }
});

document.getElementById('closeNoPasswordModal').addEventListener('click', function() {
    noPasswordModal.classList.remove('active');
});
document.getElementById('goToSettingsBtn').addEventListener('click', function() {
    noPasswordModal.classList.remove('active');
    settingsPanel.classList.add('open');
    playSound('settingsOpen');
});

// ===== РЕГИСТРАЦИЯ =====
if (userData) {
    registerScreen.style.display = 'none';
    mainScreen.style.display = 'block';
    updateProfile();
    renderPages();
    updateStats();
    updatePasswordStatus();
} else {
    registerScreen.style.display = 'block';
    mainScreen.style.display = 'none';
}

registerBtn.addEventListener('click', function() {
    const name = regName.value.trim();
    const birth = regBirth.value.trim();
    const city = regCity.value.trim();
    if (!name || !birth || !city) {
        alert('Заполните все поля');
        return;
    }
    const data = { name, birth, city };
    saveUserData(data);
    userData = data;
    registerScreen.style.display = 'none';
    mainScreen.style.display = 'block';
    updateProfile();
    renderPages();
    updateStats();
    updatePasswordStatus();
    playSound('bookOpen');
});

function updateProfile() {
    if (!userData) return;
    profileName.textContent = userData.name;
    profileBirth.textContent = userData.birth;
    profileCity.textContent = userData.city;
}

function updatePasswordStatus() {
    if (pagePassword) {
        passwordStatus.textContent = '✅ Пароль установлен';
        passwordStatus.style.color = '#4ade80';
    } else {
        passwordStatus.textContent = '❌ Пароль не установлен';
        passwordStatus.style.color = '#f87171';
    }
}

// ===== КНИГА =====
cover.addEventListener('click', function(e) {
    e.stopPropagation();
    const isOpening = book.classList.contains('open');
    book.classList.toggle('open');
    if (isOpening) {
        playSound('bookClose');
    } else {
        playSound('bookOpen');
    }
});

// ===== АНИМАЦИЯ РУЧКИ (РЕАЛЬНО ПИШЕТ) =====
function animateTyping(element, text) {
    element.innerHTML = '';
    const chars = text.split('');
    let index = 0;
    
    const pen = document.createElement('span');
    pen.className = 'pen-icon';
    pen.textContent = '✒️';
    element.appendChild(pen);
    
    const interval = setInterval(() => {
        if (index < chars.length) {
            const span = document.createElement('span');
            span.className = 'char writing';
            span.textContent = chars[index];
            element.insertBefore(span, pen);
            index++;
            if (index % 2 === 0) {
                try {
                    const audioCtx = new(window.AudioContext || window.webkitAudioContext)();
                    const bufferSize = audioCtx.sampleRate * 0.015;
                    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = (Math.random() * 2 - 1) * 0.03;
                    }
                    const source = audioCtx.createBufferSource();
                    source.buffer = buffer;
                    const gain = audioCtx.createGain();
                    gain.gain.value = 0.03;
                    source.connect(gain);
                    gain.connect(audioCtx.destination);
                    source.start();
                } catch (_) {}
            }
        } else {
            clearInterval(interval);
            const penEl = element.querySelector('.pen-icon');
            if (penEl) penEl.remove();
        }
    }, 50);
}

// ===== ОТРИСОВКА СТРАНИЦ =====
function renderPages() {
    pageLeft.innerHTML = '';
    pageRight.innerHTML = '';

    if (entries.length === 0) {
        pageLeft.innerHTML = `<div style="text-align:center;padding:30px 0;color:#7a6e5c;">📭 Пусто</div>`;
        pageRight.innerHTML = `<div style="text-align:center;padding:30px 0;color:#7a6e5c;">📭 Пусто</div>`;
        pageInfo.textContent = '0 страниц';
        return;
    }

    const totalPages = Math.ceil(entries.length / entriesPerPage);
    const start = currentPage * entriesPerPage;
    const end = Math.min(start + entriesPerPage, entries.length);
    const pageEntries = entries.slice(start, end);

    if (pageEntries.length > 0) {
        const leftEntry = pageEntries[0];
        const leftDiv = createPageElement(leftEntry);
        pageLeft.appendChild(leftDiv);
    } else {
        pageLeft.innerHTML = `<div style="text-align:center;padding:30px 0;color:#7a6e5c;">📭 Пусто</div>`;
    }

    if (pageEntries.length > 1) {
        const rightEntry = pageEntries[1];
        const rightDiv = createPageElement(rightEntry);
        pageRight.appendChild(rightDiv);
    } else {
        pageRight.innerHTML = `<div style="text-align:center;padding:30px 0;color:#7a6e5c;">📭 Пусто</div>`;
    }

    pageInfo.textContent = `Страница ${currentPage + 1} из ${totalPages}`;
    updateStats();
}

function createPageElement(entry) {
    const div = document.createElement('div');
    div.className = `page ruler-${currentRuler}`;
    if (entry.locked) div.classList.add('locked');

    const isLocked = entry.locked && pagePassword;

    div.innerHTML = `
        <div class="date">${entry.date}</div>
        <div class="text" data-id="${entry.id}" contenteditable="false">${entry.text}</div>
        <button class="delete" data-id="${entry.id}">✕</button>
    `;

    const textDiv = div.querySelector('.text');
    textDiv.style.fontFamily = currentFont === 'caveat' ? "'Caveat', cursive" :
        currentFont === 'playfair' ? "'Playfair Display', serif" :
        "'Marck Script', cursive";

    if (isLocked) {
        textDiv.innerText = '🔒 Нажмите, чтобы ввести пароль';
        textDiv.style.color = '#a89880';
        textDiv.style.cursor = 'pointer';
        textDiv.style.fontSize = '1.1rem';
        textDiv.style.textAlign = 'center';
        textDiv.style.padding = '20px 0';
        textDiv.addEventListener('click', function(e) {
            e.stopPropagation();
            pendingUnlockId = entry.id;
            document.getElementById('customPasswordInput').value = '';
            passwordModal.classList.add('active');
        });
    } else {
        textDiv.style.color = '';
        textDiv.contentEditable = 'true';
        textDiv.style.cursor = 'text';
        textDiv.style.fontSize = '1rem';
        textDiv.style.lineHeight = '1.8';
        textDiv.style.padding = '4px 0';
        
        if (entry.text && entry.text.trim()) {
            animateTyping(textDiv, entry.text);
        } else {
            textDiv.textContent = '';
        }
        
        textDiv.addEventListener('input', function() {
            const id = Number(this.dataset.id);
            const newText = this.innerText.trim();
            const entry = entries.find(e => e.id === id);
            if (entry) {
                entry.text = newText;
                saveEntriesToStorage();
            }
        });
        
        textDiv.addEventListener('focus', function() {
            const pen = this.querySelector('.pen-icon');
            if (pen) pen.remove();
        });
    }

    div.querySelector('.delete').addEventListener('click', function(e) {
        e.stopPropagation();
        const id = Number(this.dataset.id);
        entries = entries.filter(e => e.id !== id);
        saveEntriesToStorage();
        if (currentPage > 0 && currentPage * entriesPerPage >= entries.length) {
            currentPage = Math.max(0, currentPage - 1);
        }
        renderPages();
        playSound('pageTurn');
    });

    return div;
}

// ===== ДОБАВЛЕНИЕ СТРАНИЦЫ =====
function addNewPage(locked) {
    const newEntry = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        text: '',
        locked: locked
    };
    entries.push(newEntry);
    saveEntriesToStorage();
    const totalPages = Math.ceil(entries.length / entriesPerPage);
    currentPage = totalPages - 1;
    renderPages();
    
    // ===== АНИМАЦИЯ РУЧКИ ДЛЯ НОВОЙ СТРАНИЦЫ =====
    setTimeout(() => {
        const allTexts = document.querySelectorAll('.page:not(.locked) .text');
        const lastText = allTexts[allTexts.length - 1];
        if (lastText && lastText.innerText.trim()) {
            animateTyping(lastText, lastText.innerText.trim());
        }
    }, 150);
    
    playSound('addPage');
    if (!book.classList.contains('open')) {
        book.classList.add('open');
        playSound('bookOpen');
    }
    if (locked) {
        setTimeout(() => {
            const entry = entries.find(e => e.id === newEntry.id);
            if (entry && entry.locked) {
                playSound('lock');
            }
        }, LOCK_DELAY * 1000);
    }
}

// ===== ЛИСТАНИЕ =====
let dragStartX = 0;
let isDragging = false;
let currentDragPage = null;
let dragOffsetX = 0;
let pageTurnProgress = 0;

function turnPage(direction) {
    const totalPages = Math.ceil(entries.length / entriesPerPage);
    const pages = pagesContainer;
    
    if (direction === 'next' && currentPage < totalPages - 1) {
        pages.classList.add('turning');
        setTimeout(() => {
            currentPage++;
            renderPages();
            pages.classList.remove('turning');
            playSound('pageTurn');
        }, 350);
    } else if (direction === 'prev' && currentPage > 0) {
        pages.classList.add('turning-back');
        setTimeout(() => {
            currentPage--;
            renderPages();
            pages.classList.remove('turning-back');
            playSound('pageTurn');
        }, 350);
    }
}

pagesContainer.addEventListener('mousedown', startDrag);
pagesContainer.addEventListener('touchstart', startDrag, { passive: true });
document.addEventListener('mousemove', moveDrag);
document.addEventListener('touchmove', moveDrag, { passive: true });
document.addEventListener('mouseup', endDrag);
document.addEventListener('touchend', endDrag);

function startDrag(e) {
    if (!book.classList.contains('open')) return;
    if (e.target.closest('button') || e.target.closest('.delete') || e.target.closest('.text')) return;

    const touch = e.touches ? e.touches[0] : e;
    dragStartX = touch.clientX;
    isDragging = true;
    currentDragPage = null;
    dragOffsetX = 0;
    pageTurnProgress = 0;
}

function moveDrag(e) {
    if (!isDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const deltaX = touch.clientX - dragStartX;

    if (!currentDragPage) {
        const rect = pagesContainer.getBoundingClientRect();
        const clickX = touch.clientX - rect.left;
        const width = rect.width;
        if (clickX > width * 0.5 && deltaX < 0) {
            currentDragPage = 'right';
        } else if (clickX < width * 0.5 && deltaX > 0) {
            currentDragPage = 'left';
        } else {
            return;
        }
    }

    const maxDrag = 150;
    dragOffsetX = Math.min(Math.max(deltaX, -maxDrag), maxDrag);
    pageTurnProgress = Math.abs(dragOffsetX) / maxDrag;

    const pages = pagesContainer;
    if (currentDragPage === 'right' && dragOffsetX < 0) {
        pages.style.transition = 'none';
        pages.style.transform = `rotateY(${-pageTurnProgress * 15}deg) scale(${1 - pageTurnProgress * 0.02})`;
        pages.style.boxShadow = `${-dragOffsetX * 0.5}px 0 30px rgba(0,0,0,${pageTurnProgress * 0.2})`;
        const rightPage = pageRight;
        if (rightPage) {
            rightPage.style.transition = 'none';
            rightPage.style.transform = `perspective(800px) rotateY(${pageTurnProgress * 30}deg) translateX(${dragOffsetX * 0.3}px)`;
            rightPage.style.boxShadow = `${-dragOffsetX * 0.2}px 0 20px rgba(0,0,0,${pageTurnProgress * 0.15})`;
        }
    } else if (currentDragPage === 'left' && dragOffsetX > 0) {
        pages.style.transition = 'none';
        pages.style.transform = `rotateY(${pageTurnProgress * 15}deg) scale(${1 - pageTurnProgress * 0.02})`;
        pages.style.boxShadow = `${dragOffsetX * 0.5}px 0 30px rgba(0,0,0,${pageTurnProgress * 0.2})`;
        const leftPage = pageLeft;
        if (leftPage) {
            leftPage.style.transition = 'none';
            leftPage.style.transform = `perspective(800px) rotateY(${-pageTurnProgress * 30}deg) translateX(${dragOffsetX * 0.3}px)`;
            leftPage.style.boxShadow = `${dragOffsetX * 0.2}px 0 20px rgba(0,0,0,${pageTurnProgress * 0.15})`;
        }
    }
}

function endDrag() {
    if (!isDragging) {
        resetPageStyles();
        return;
    }

    isDragging = false;
    const threshold = 50;

    if (Math.abs(dragOffsetX) > threshold) {
        const totalPages = Math.ceil(entries.length / entriesPerPage);
        if (currentDragPage === 'right' && dragOffsetX < 0 && currentPage < totalPages - 1) {
            turnPage('next');
        } else if (currentDragPage === 'left' && dragOffsetX > 0 && currentPage > 0) {
            turnPage('prev');
        }
    }

    resetPageStyles();
    currentDragPage = null;
    dragOffsetX = 0;
    pageTurnProgress = 0;
}

function resetPageStyles() {
    const pages = pagesContainer;
    pages.style.transition = 'transform 0.3s ease';
    pages.style.transform = '';
    pages.style.boxShadow = '';
    pageLeft.style.transition = 'transform 0.3s ease';
    pageLeft.style.transform = '';
    pageLeft.style.boxShadow = '';
    pageRight.style.transition = 'transform 0.3s ease';
    pageRight.style.transform = '';
    pageRight.style.boxShadow = '';
}

// ===== ЭКСПОРТ =====
exportBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (entries.length === 0) {
        alert('Нет страниц для экспорта');
        return;
    }
    const content = entries.map(e => `[${e.date}] ${e.text}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'дневник_жизни.txt';
    link.click();
});

// ===== НАСТРОЙКИ =====
settingsToggle.addEventListener('click', function() {
    const isOpen = settingsPanel.classList.contains('open');
    if (isOpen) {
        settingsPanel.classList.remove('open');
        playSound('settingsClose');
    } else {
        settingsPanel.classList.add('open');
        playSound('settingsOpen');
    }
});

closeSettings.addEventListener('click', function() {
    settingsPanel.classList.remove('open');
    playSound('settingsClose');
});

// ===== ВЫХОД =====
logoutBtn.addEventListener('click', function() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(STORAGE_KEY);
    userData = null;
    entries = [];
    registerScreen.style.display = 'block';
    mainScreen.style.display = 'none';
    settingsPanel.classList.remove('open');
    regName.value = '';
    regBirth.value = '';
    regCity.value = '';
    playSound('bookClose');
});

// ===== ШРИФТЫ =====
fontSelect.addEventListener('change', function() {
    currentFont = this.value;
    localStorage.setItem('lifeDiaryFont', currentFont);
    document.querySelectorAll('.page .text').forEach(el => {
        el.style.fontFamily = currentFont === 'caveat' ? "'Caveat', cursive" :
            currentFont === 'playfair' ? "'Playfair Display', serif" :
            "'Marck Script', cursive";
    });
});

// ===== РАЗЛИНОВКА =====
rulerBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        rulerBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentRuler = this.dataset.ruler;
        localStorage.setItem('lifeDiaryRuler', currentRuler);
        renderPages();
    });
});

// ===== ОБЛОЖКА =====
const coverNameDisplay = document.getElementById('coverNameDisplay');
const coverNames = {
    default: 'Классическая',
    dark: 'Тёмная',
    light: 'Светлая',
    green: 'Зелёная'
};

document.querySelectorAll('.cover-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.cover-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const coverType = this.dataset.cover;
        cover.className = 'cover';
        cover.classList.add('cover-' + coverType);
        localStorage.setItem('lifeDiaryCover', coverType);
        if (coverNameDisplay) {
            coverNameDisplay.textContent = coverNames[coverType] || coverType;
        }
    });
});

const savedCover = localStorage.getItem('lifeDiaryCover') || 'default';
cover.className = 'cover';
cover.classList.add('cover-' + savedCover);
document.querySelectorAll('.cover-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cover === savedCover);
});
if (coverNameDisplay) {
    coverNameDisplay.textContent = coverNames[savedCover] || savedCover;
}

// ===== ВЫБОР ФОНА =====
document.querySelectorAll('.bg-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const bg = this.dataset.bg;
        const colors = {
            paper: '#f5e6c8',
            blue: '#1e293b',
            dark: '#0f172a',
            light: '#f4f1ea',
            green: '#1a3a2a'
        };
        document.querySelector('.app').style.background = colors[bg] || '#f5e6c8';
        document.querySelector('.main-screen').style.background = colors[bg] || '#f5e6c8';
        document.body.style.background = colors[bg] || '#f5e6c8';
        localStorage.setItem('lifeDiaryBg', bg);
    });
});

const savedBg = localStorage.getItem('lifeDiaryBg') || 'paper';
document.querySelectorAll('.bg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.bg === savedBg);
});
const colors = {
    paper: '#f5e6c8',
    blue: '#1e293b',
    dark: '#0f172a',
    light: '#f4f1ea',
    green: '#1a3a2a'
};
document.querySelector('.app').style.background = colors[savedBg] || '#f5e6c8';
document.querySelector('.main-screen').style.background = colors[savedBg] || '#f5e6c8';
document.body.style.background = colors[savedBg] || '#f5e6c8';

// ===== ПАРОЛЬ =====
savePasswordBtn.addEventListener('click', function() {
    const pwd = passwordInput.value.trim();
    if (!pwd) {
        alert('Введите пароль');
        return;
    }
    localStorage.setItem('lifeDiaryPassword', pwd);
    pagePassword = pwd;
    alert('Пароль сохранён!');
    passwordInput.value = '';
    updatePasswordStatus();
    renderPages();
});

// ===== СТАТИСТИКА =====
function updateStats() {
    const total = entries.length;
    const locked = entries.filter(e => e.locked).length;
    const open = total - locked;
    if (statTotal) statTotal.textContent = total;
    if (statLocked) statLocked.textContent = locked;
    if (statOpen) statOpen.textContent = open;
}

// ===== СБРОС =====
resetDataBtn.addEventListener('click', function() {
    if (confirm('Вы уверены, что хотите удалить ВСЕ записи? Это действие необратимо.')) {
        entries = [];
        saveEntriesToStorage();
        renderPages();
        updateStats();
        alert('Все данные сброшены.');
    }
});

// ===== ЗАГРУЗКА НАСТРОЕК =====
function loadSettings() {
    const savedFont = localStorage.getItem('lifeDiaryFont') || 'marck';
    currentFont = savedFont;
    fontSelect.value = savedFont;
    const savedRuler = localStorage.getItem('lifeDiaryRuler') || 'line';
    currentRuler = savedRuler;
    rulerBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.ruler === savedRuler);
    });
}

loadSettings();
if (userData) {
    renderPages();
}