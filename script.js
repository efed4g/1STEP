const habitInput = document.getElementById('habitInput');
const addBtn = document.getElementById('addBtn');
const habitsList = document.getElementById('habitsList');

// 👑 ADMIN KULLANICI ADI (bu kullanıcı adıyla kayıt olan/hesap admin rozetini görür)
const ADMIN_USERNAME = "Efehaei";

// 🔥 FIREBASE YAPILANDIRMASI
const firebaseConfig = {
    apiKey: "AIzaSyDWCo4uxYnBzZE2GrySIyPpG01yvts9AyQ",
    authDomain: "step-35a2b.firebaseapp.com",
    projectId: "step-35a2b",
    storageBucket: "step-35a2b.firebasestorage.app",
    messagingSenderId: "759360554165",
    appId: "1:759360554165:web:cb4ff313d75e43b97d6afc",
    measurementId: "G-Y1HTMZMJBZ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 🎵 SES
function playSuccessSound() {
    try {
        const audio = new Audio('success.mp3');
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Ses oynatma hatası:", e));
    } catch (e) {
        console.log("Ses yükleme hatası:", e);
    }
}

// GÜVENLİ STORAGE (sadece tema tercihi için kullanılıyor)
function setSafeStorage(key, val) {
    try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch (e) {}
}
function getSafeStorage(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return raw; }
    } catch (e) {
        return null;
    }
}

let currentUser = null; // { uid, username }
let habits = [];

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (!errorEl) return;
    errorEl.innerText = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => { errorEl.classList.add('hidden'); }, 3500);
}

// TEMA (DARK / LIGHT MODE)
const themeToggleBtn = document.getElementById('themeToggle');
let currentTheme = getSafeStorage('1step_theme') || 'dark';

if (currentTheme === 'light') {
    document.body.classList.add('light-mode');
    updateThemeIcon('light');
}

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    currentTheme = isLight ? 'light' : 'dark';
    setSafeStorage('1step_theme', currentTheme);
    updateThemeIcon(currentTheme);
});

function updateThemeIcon(theme) {
    themeToggleBtn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
}

// Firebase Authentication e-posta ister; kullanıcı adını sahte bir e-postaya çeviriyoruz
function usernameToEmail(username) {
    return username.toLowerCase().replace(/[^a-z0-9]/g, '') + "@1step-users.app";
}

// 📌 GİRİŞ YAPMA İŞLEMİ
async function handleLogin(e) {
    if (e) { try { e.preventDefault(); } catch (err) {} }

    const uNameInput = (document.getElementById('loginUsername').value || '').trim();
    const uPassInput = document.getElementById('loginPassword').value;

    if (uNameInput === "" || uPassInput === "") {
        showError('loginError', 'Lütfen tüm alanları doldurun!');
        return;
    }

    const pseudoEmail = usernameToEmail(uNameInput);

    try {
        const cred = await auth.signInWithEmailAndPassword(pseudoEmail, uPassInput);
        const docSnap = await db.collection('users').doc(cred.user.uid).get();
        const data = docSnap.data() || {};
        currentUser = { uid: cred.user.uid, username: data.username || uNameInput };
        habits = data.habits || [];
        initUserSession();
    } catch (err) {
        showError('loginError', 'Kullanıcı adı veya şifre hatalı!');
    }
}

// 📌 KAYIT OLMA İŞLEMİ
async function handleRegister(e) {
    if (e) { try { e.preventDefault(); } catch (err) {} }

    const uNameInput = (document.getElementById('regUsername').value || '').trim();
    const uPassInput = document.getElementById('regPassword').value;

    if (uNameInput === "" || uPassInput === "") {
        showError('regError', 'Lütfen tüm alanları doldurun!');
        return;
    }
    if (uPassInput.length < 6) {
        showError('regError', 'Şifre en az 6 karakter olmalı!');
        return;
    }

    const usernameLower = uNameInput.toLowerCase();
    const pseudoEmail = usernameToEmail(uNameInput);

    try {
        const existing = await db.collection('users').where('usernameLower', '==', usernameLower).limit(1).get();
        if (!existing.empty) {
            showError('regError', 'Bu kullanıcı adı zaten alınmış!');
            return;
        }

        const cred = await auth.createUserWithEmailAndPassword(pseudoEmail, uPassInput);
        await db.collection('users').doc(cred.user.uid).set({
            username: uNameInput,
            usernameLower: usernameLower,
            habits: []
        });

        currentUser = { uid: cred.user.uid, username: uNameInput };
        habits = [];
        initUserSession();
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            showError('regError', 'Bu kullanıcı adı zaten alınmış!');
        } else if (err.code === 'auth/weak-password') {
            showError('regError', 'Şifre çok zayıf, en az 6 karakter olmalı!');
        } else {
            showError('regError', 'Kayıt sırasında bir hata oluştu.');
            console.log(err);
        }
    }
}

function initUserSession() {
    if (!currentUser) {
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('appContent').classList.add('hidden');
        document.getElementById('userBar').classList.add('hidden');
        return;
    }

    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('userBar').classList.remove('hidden');

    const userBadge = document.getElementById('userBadge');
    const adminBtn = document.getElementById('adminPanelBtn');

    if (currentUser.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        userBadge.innerHTML = `<div class="badge-admin"><i class="fa-solid fa-crown crown-icon"></i> <span>${currentUser.username}</span> <span class="badge-tag">FOUNDER & ADMIN</span></div>`;
        adminBtn.classList.remove('hidden');
    } else {
        userBadge.innerHTML = `<span class="badge-user">👤 ${currentUser.username}</span>`;
        adminBtn.classList.add('hidden');
    }

    renderHabits();
}

function logout() {
    auth.signOut();
    currentUser = null;
    habits = [];
    initUserSession();
}

// Oturum devamlılığı: Firebase sayfa yenilendiğinde otomatik kontrol eder
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const docSnap = await db.collection('users').doc(user.uid).get();
        const data = docSnap.data();
        if (data) {
            currentUser = { uid: user.uid, username: data.username };
            habits = data.habits || [];
        }
    } else {
        currentUser = null;
        habits = [];
    }
    initUserSession();
});

async function saveHabitsToFirestore() {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).update({ habits });
    } catch (e) {
        console.log("Kaydetme hatası:", e);
    }
}

async function openAdminModal() {
    if (!currentUser || currentUser.username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) return;

    const modal = document.getElementById('adminModal');
    const listContainer = document.getElementById('adminUsersList');
    listContainer.innerHTML = "<p>Yükleniyor...</p>";
    modal.classList.remove('hidden');

    const snapshot = await db.collection('users').get();
    let totalHabits = 0;
    listContainer.innerHTML = "";

    snapshot.forEach(doc => {
        const u = doc.data();
        const uHabits = u.habits ? u.habits.length : 0;
        totalHabits += uHabits;

        const row = document.createElement('div');
        row.className = 'admin-user-row';
        row.innerHTML = `
            <span><strong>${u.username}</strong> ${u.username.toLowerCase() === ADMIN_USERNAME.toLowerCase() ? '(Admin)' : ''}</span>
            <span>${uHabits} Alışkanlık</span>
        `;
        listContainer.appendChild(row);
    });

    document.getElementById('adminTotalUsers').innerText = snapshot.size;
    document.getElementById('adminTotalHabits').innerText = totalHabits;
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.add('hidden');
}

function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

addBtn.addEventListener('click', () => {
    const text = habitInput.value.trim();

    if (text === "") {
        showError('habitError', 'Lütfen bir alışkanlık adı yazın!');
        return;
    }

    const newHabit = {
        id: Date.now(),
        title: text,
        createdAt: getTodayString(),
        completedDates: []
    };

    habits.push(newHabit);
    saveHabitsToFirestore();
    habitInput.value = "";
    renderHabits();
});

function calculateStreak(completedDates) {
    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (completedDates.includes(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            const isToday = dateStr === getTodayString();
            if (isToday) {
                checkDate.setDate(checkDate.getDate() - 1);
                const yesterdayStr = checkDate.toISOString().split('T')[0];
                if (completedDates.includes(yesterdayStr)) continue;
            }
            break;
        }
    }
    return streak;
}

function getMilestoneBadge(streak) {
    if (streak >= 30) return { icon: '🏆', name: 'Efsane' };
    if (streak >= 14) return { icon: '🥇', name: 'Şampiyon' };
    if (streak >= 7) return { icon: '🥈', name: 'Kararlı' };
    if (streak >= 3) return { icon: '🥉', name: 'Çaylak' };
    return null;
}

function getGitHubCalendarData() {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek - (51 * 7));

    const daysList = [];
    const monthLabels = [];
    let currentMonth = -1;
    let currentDate = new Date(startDate);

    for (let i = 0; i < 364; i++) {
        if (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const month = currentDate.getMonth();
            const weekIndex = Math.floor(i / 7);

            if (i % 7 === 0 && month !== currentMonth) {
                currentMonth = month;
                const monthName = currentDate.toLocaleDateString('tr-TR', { month: 'short' });
                monthLabels.push({ weekIndex, name: monthName });
            }

            daysList.push({ dateStr: dateStr, dateObj: new Date(currentDate), isFuture: false });
        } else {
            daysList.push({ dateStr: '', isFuture: true });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return { daysList, monthLabels };
}

function updateStatsOverview() {
    const totalHabits = habits.length;
    const todayStr = getTodayString();
    let completedTodayCount = 0;
    let maxStreak = 0;
    let totalTrophies = 0;

    habits.forEach(h => {
        if (h.completedDates.includes(todayStr)) completedTodayCount++;
        const s = calculateStreak(h.completedDates);
        if (s > maxStreak) maxStreak = s;
        if (getMilestoneBadge(s)) totalTrophies++;
    });

    document.getElementById('statTotalHabits').innerText = totalHabits;
    document.getElementById('statBestStreak').innerText = `${maxStreak} Gün`;
    document.getElementById('statTrophies').innerText = `${totalTrophies} Rozet`;
}

function renderHabits() {
    habitsList.innerHTML = "";
    updateStatsOverview();

    if (habits.length === 0) {
        habitsList.innerHTML = '<p class="empty-msg">Henüz alışkanlık eklenmedi. Yukarıdan ilk alışkanlığını ekle!</p>';
        return;
    }

    const todayStr = getTodayString();
    const { daysList, monthLabels } = getGitHubCalendarData();

    habits.forEach(habit => {
        const streak = calculateStreak(habit.completedDates);
        const isCompletedToday = habit.completedDates.includes(todayStr);
        const milestone = getMilestoneBadge(streak);

        const card = document.createElement('div');
        card.className = `habit-card ${isCompletedToday ? 'done' : ''}`;

        let monthHtml = '<div class="month-row">';
        let lastWeekIndex = 0;
        monthLabels.forEach((m, idx) => {
            const spanWidth = (m.weekIndex - lastWeekIndex) * 11.5;
            lastWeekIndex = m.weekIndex;
            if (idx > 0) {
                monthHtml += `<span class="month-name" style="margin-left: ${spanWidth}px;">${m.name}</span>`;
            } else {
                monthHtml += `<span class="month-name">${m.name}</span>`;
            }
        });
        monthHtml += '</div>';

        let levelClass = 'level-1';
        if (streak >= 15) levelClass = 'level-4';
        else if (streak >= 8) levelClass = 'level-3';
        else if (streak >= 4) levelClass = 'level-2';

        let gridHtml = '<div class="github-grid">';
        daysList.forEach(day => {
            if (day.isFuture) {
                gridHtml += `<div class="grid-square future"></div>`;
                return;
            }

            const isDone = habit.completedDates.includes(day.dateStr);
            const isToday = day.dateStr === todayStr;
            const formattedDate = day.dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

            const clickAttr = isToday ? `onclick="toggleHabitDate(${habit.id}, '${day.dateStr}')"` : '';
            const activeClass = isDone ? (isToday ? 'level-4 active' : levelClass) : 'level-0';

            gridHtml += `
                <div 
                    class="grid-square ${activeClass} ${isToday ? 'today' : 'read-only'}" 
                    title="${formattedDate}: ${isDone ? 'Tamamlandı' : 'Tamamlanmadı'}${isToday ? ' (Bugün)' : ''}"
                    ${clickAttr}
                ></div>
            `;
        });
        gridHtml += '</div>';

        const badgeHtml = milestone ? `<span class="milestone-badge" title="${milestone.name} Seviyesi">${milestone.icon} ${milestone.name}</span>` : '';

        card.innerHTML = `
            <div class="habit-header">
                <div class="habit-info">
                    <h3>${habit.title} ${badgeHtml}</h3>
                    <span class="streak-badge">🔥 ${streak} Gün Seri</span>
                </div>
                <div class="habit-actions">
                    <button class="btn-check ${isCompletedToday ? 'completed' : ''}" onclick="toggleHabitDate(${habit.id}, '${todayStr}')">
                        ${isCompletedToday ? '✓ Tamamlandı' : 'Bugün Tamamla'}
                    </button>
                    <button class="btn-edit" title="Düzenle" onclick="editHabit(${habit.id})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-delete" title="Alışkanlığı Sil" onclick="deleteHabit(${habit.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="grid-container">
                <div class="grid-body">
                    <div class="day-labels">
                        <span>Pzt</span>
                        <span>Çar</span>
                        <span>Cum</span>
                    </div>
                    <div class="github-grid-scroll">
                        ${monthHtml}
                        ${gridHtml}
                    </div>
                </div>
                <div class="grid-footer">
                    <div class="grid-legend">
                        <span>Daha az</span>
                        <span class="legend-box level-0"></span>
                        <span class="legend-box level-1"></span>
                        <span class="legend-box level-2"></span>
                        <span class="legend-box level-3"></span>
                        <span class="legend-box level-4"></span>
                        <span>Daha çok</span>
                    </div>
                </div>
            </div>
        `;

        habitsList.appendChild(card);

        const scrollContainer = card.querySelector('.github-grid-scroll');
        if (scrollContainer) {
            scrollContainer.scrollLeft = scrollContainer.scrollWidth;
        }
    });
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#34d399', '#f59e0b', '#38bdf8']
        });
    }
}

function toggleHabitDate(habitId, dateStr) {
    const todayStr = getTodayString();
    if (dateStr !== todayStr) return;

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const dateIndex = habit.completedDates.indexOf(dateStr);
    if (dateIndex === -1) {
        habit.completedDates.push(dateStr);
        playSuccessSound();
        triggerConfetti();
    } else {
        habit.completedDates.splice(dateIndex, 1);
    }

    saveHabitsToFirestore();
    renderHabits();
}

function editHabit(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const newTitle = prompt("Alışkanlığın yeni ismini yazın:", habit.title);
    if (newTitle !== null && newTitle.trim() !== "") {
        habit.title = newTitle.trim();
        saveHabitsToFirestore();
        renderHabits();
    }
}

function deleteHabit(habitId) {
    if (confirm("Bu alışkanlığı silmek istediğine emin misin?")) {
        habits = habits.filter(h => h.id !== habitId);
        saveHabitsToFirestore();
        renderHabits();
    }
}
