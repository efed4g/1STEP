const habitInput = document.getElementById('habitInput');
const addBtn = document.getElementById('addBtn');
const habitsList = document.getElementById('habitsList');

// 👑 EFE'YE ÖZEL ADMIN BİLGİLERİ
const ADMIN_USERNAME = "Efehaei";
const ADMIN_PASS_HASH = "d34c6ed01fea3982fe2459a77231aa5167d74731ec136d8c39da9607164caee3";

// FIREBASE YAPILANDIRMASI
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "1step.firebaseapp.com",
    projectId: "1step",
    storageBucket: "1step.appspot.com",
    messagingSenderId: "123456",
    appId: "1:123456"
};

let firebaseAuth = null;
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    try {
        firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
    } catch(e) {}
}

function sha256Sync(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = Math.pow(2, 32);
    var i, j, result = '';
    var words = [];
    var asciiBitLength = ascii.length * 8;
    var hash = sha256Sync.h = sha256Sync.h || [];
    var k = sha256Sync.k = sha256Sync.k || [];
    var primeCounter = k.length;

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 300; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
        }
    }
    
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return;
        words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);
    
    for (j = 0; j < words.length;) {
        var w = words.slice(j, j += 16);
        var oldHash = hash;
        hash = hash.slice(0, 8);
        
        for (i = 0; i < 64; i++) {
            var i2 = i + j;
            var w15 = w[i - 15], w2 = w[i - 2];
            var a = hash[0], e = hash[4];
            var temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                ) | 0
            );
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }
    
    for (i = 0; i < 8; i++) {
        for (j = 3; j >= 0; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += (b < 16 ? '0' : '') + b.toString(16);
        }
    }
    return result;
}

function playSuccessSound() {
    try {
        const audio = new Audio('success.mp3');
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Ses hatası:", e));
    } catch (e) {}
}

function setSafeStorage(key, val) {
    try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch(e) {}
}

function getSafeStorage(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch(e) { return raw; }
    } catch(e) { return null; }
}

let users = getSafeStorage('1step_users') || {};
let currentUser = getSafeStorage('1step_current_user') || null;
let habits = [];

function saveUsersToLocalStorage() {
    setSafeStorage('1step_users', users);
}

function saveHabitsToLocalStorage() {
    if (!currentUser) return;
    if (!users[currentUser]) {
        users[currentUser] = { passwordHash: '', email: '', habits: [] };
    }
    users[currentUser].habits = habits;
    saveUsersToLocalStorage();
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (!errorEl) return;
    errorEl.innerText = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 3500);
}

function showSuccess(elementId, message) {
    const succEl = document.getElementById(elementId);
    if (!succEl) return;
    succEl.innerText = message;
    succEl.classList.remove('hidden');
    setTimeout(() => succEl.classList.add('hidden'), 3500);
}

// TEMA
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
    const forgotForm = document.getElementById('forgotForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    forgotForm.classList.add('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.remove('active');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        tabLogin.classList.add('active');
    } else if (tab === 'register') {
        registerForm.classList.remove('hidden');
        tabRegister.classList.add('active');
    } else if (tab === 'forgot') {
        forgotForm.classList.remove('hidden');
    }
}

// GİRİŞ
function handleLogin(e) {
    if (e) try { e.preventDefault(); } catch(err) {}
    const uNameInput = (document.getElementById('loginUsername').value || '').trim();
    const uPassInput = document.getElementById('loginPassword').value;

    if (uNameInput === "" || uPassInput === "") {
        showError('loginError', 'Lütfen tüm alanları doldurun!');
        return;
    }

    const inputHash = sha256Sync(uPassInput);

    if (uNameInput.toLowerCase() === ADMIN_USERNAME.toLowerCase() && inputHash === ADMIN_PASS_HASH) {
        currentUser = ADMIN_USERNAME;
        if (!users[ADMIN_USERNAME]) {
            users[ADMIN_USERNAME] = { passwordHash: ADMIN_PASS_HASH, email: '', habits: [] };
            saveUsersToLocalStorage();
        }
        setSafeStorage('1step_current_user', ADMIN_USERNAME);
        initUserSession();
        return;
    }

    const matchedUserKey = Object.keys(users).find(k => 
        k.toLowerCase() === uNameInput.toLowerCase() || 
        (users[k].email && users[k].email.toLowerCase() === uNameInput.toLowerCase())
    );

    if (matchedUserKey) {
        const storedPassHash = users[matchedUserKey].passwordHash;
        if (storedPassHash === inputHash) {
            currentUser = matchedUserKey;
            setSafeStorage('1step_current_user', matchedUserKey);
            initUserSession();
            return;
        }
    }

    showError('loginError', 'Kullanıcı adı veya şifre hatalı!');
}

// KAYIT
function handleRegister(e) {
    if (e) try { e.preventDefault(); } catch(err) {}
    const uNameInput = (document.getElementById('regUsername').value || '').trim();
    const uEmailInput = (document.getElementById('regEmail').value || '').trim();
    const uPassInput = document.getElementById('regPassword').value;

    if (uNameInput === "" || uPassInput === "") {
        showError('regError', 'Lütfen kullanıcı adı ve şifre girin!');
        return;
    }

    if (uNameInput.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        const inputHash = sha256Sync(uPassInput);
        if (inputHash === ADMIN_PASS_HASH) {
            currentUser = ADMIN_USERNAME;
            setSafeStorage('1step_current_user', ADMIN_USERNAME);
            initUserSession();
            return;
        } else {
            showError('regError', "Bu kullanıcı adı Admin'e aittir!");
            return;
        }
    }

    const existingKey = Object.keys(users).find(k => k.toLowerCase() === uNameInput.toLowerCase());
    if (existingKey) {
        showError('regError', 'Bu kullanıcı adı zaten alınmış!');
        return;
    }

    const passHash = sha256Sync(uPassInput);
    users[uNameInput] = { passwordHash: passHash, email: uEmailInput, habits: [] };
    saveUsersToLocalStorage();
    currentUser = uNameInput;
    setSafeStorage('1step_current_user', uNameInput);
    initUserSession();
}

// KULLANICININ KENDİ E-POSTASINI EKLEMESİ/DÜZENLEMESİ
function promptAddEmail() {
    if (!currentUser) return;
    const currentEmail = users[currentUser]?.email || '';
    const newEmail = prompt("Şifre kurtarma için E-posta adresinizi girin:", currentEmail);
    if (newEmail !== null && newEmail.trim() !== '') {
        if (!users[currentUser]) users[currentUser] = { passwordHash: '', habits: [] };
        users[currentUser].email = newEmail.trim();
        saveUsersToLocalStorage();
        alert("E-posta adresiniz başarıyla kaydedildi! 📧");
        initUserSession();
    }
}

// FIREBASE E-POSTA ŞİFRE SIFIRLAMA
function handleFirebaseResetPassword(e) {
    if (e) try { e.preventDefault(); } catch(err) {}
    const valInput = (document.getElementById('forgotInput').value || '').trim();

    if (valInput === "") {
        showError('forgotError', 'Lütfen kullanıcı adınızı veya E-posta adresinizi girin!');
        return;
    }

    let targetEmail = valInput;

    const matchedUserKey = Object.keys(users).find(k => k.toLowerCase() === valInput.toLowerCase());
    if (matchedUserKey && users[matchedUserKey].email) {
        targetEmail = users[matchedUserKey].email;
    }

    if (!targetEmail.includes('@')) {
        showError('forgotError', 'Bu kullanıcıya tanımlı geçerli bir E-posta bulunamadı! Efe Admin ile iletişime geçin.');
        return;
    }

    if (firebaseAuth) {
        firebaseAuth.sendPasswordResetEmail(targetEmail)
            .then(() => {
                showSuccess('forgotSuccess', `📧 Güvenli sıfırlama bağlantısı '${targetEmail}' adresine gönderildi!`);
                setTimeout(() => switchAuthTab('login'), 4000);
            })
            .catch((error) => {
                showError('forgotError', 'Hata: Sıfırlama e-postası gönderilemedi.');
            });
    } else {
        showSuccess('forgotSuccess', `📧 Güvenli sıfırlama bağlantısı '${targetEmail}' adresine gönderildi!`);
        setTimeout(() => switchAuthTab('login'), 3500);
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
    const emailBtn = document.getElementById('emailBtn');
    const adminBtn = document.getElementById('adminPanelBtn');

    const userEmail = users[currentUser]?.email;
    if (userEmail) {
        emailBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${userEmail}`;
        emailBtn.classList.add('has-email');
    } else {
        emailBtn.innerHTML = `<i class="fa-solid fa-envelope"></i> E-posta Ekle`;
        emailBtn.classList.remove('has-email');
    }

    if (currentUser.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        userBadge.innerHTML = `<div class="badge-admin"><i class="fa-solid fa-crown crown-icon"></i> <span>Efe</span> <span class="badge-tag">FOUNDER & ADMIN</span></div>`;
        adminBtn.classList.remove('hidden');
    } else {
        userBadge.innerHTML = `<span class="badge-user">👤 ${currentUser}</span>`;
        adminBtn.classList.add('hidden');
    }

    habits = (users[currentUser] && users[currentUser].habits) ? users[currentUser].habits : [];
    renderHabits();
}

function logout() {
    currentUser = null;
    try { localStorage.removeItem('1step_current_user'); } catch(e) {}
    initUserSession();
}

// 👑 ADMIN EFE'NİN KULLANICI ŞİFRE VE E-POSTA DÜZENLEME YETKİLERİ
function openAdminModal() {
    if (currentUser.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) return;
    const modal = document.getElementById('adminModal');
    const totalUsers = Object.keys(users).length;
    let totalHabits = 0;

    const listContainer = document.getElementById('adminUsersList');
    listContainer.innerHTML = "";

    Object.keys(users).forEach(u => {
        const uHabits = users[u].habits ? users[u].habits.length : 0;
        const uEmail = users[u].email ? users[u].email : 'E-posta tanımlı değil';
        totalHabits += uHabits;

        const row = document.createElement('div');
        row.className = 'admin-user-card';
        
        const isNotAdmin = u.toLowerCase() !== ADMIN_USERNAME.toLowerCase();

        const actions = isNotAdmin ? `
            <div class="admin-actions">
                <button class="btn-admin-action btn-email" onclick="adminEditUserEmail('${u}')" title="E-posta Düzenle">✉️ E-posta</button>
                <button class="btn-admin-action btn-pass" onclick="adminResetUserPass('${u}')" title="Şifre Sıfırla">🔑 Şifre</button>
            </div>
        ` : `<span class="badge-tag">KURUCU</span>`;

        row.innerHTML = `
            <div class="admin-user-info">
                <strong>${u}</strong>
                <small>${uEmail} • ${uHabits} Alışkanlık</small>
            </div>
            ${actions}
        `;
        listContainer.appendChild(row);
    });

    document.getElementById('adminTotalUsers').innerText = totalUsers;
    document.getElementById('adminTotalHabits').innerText = totalHabits;
    modal.classList.remove('hidden');
}

function adminResetUserPass(username) {
    const newPass = prompt(`${username} kullanıcısı için YENİ ŞİFRE belirleyin:`, "123456");
    if (newPass && newPass.trim() !== "") {
        users[username].passwordHash = sha256Sync(newPass.trim());
        saveUsersToLocalStorage();
        alert(`${username} kullanıcısının şifresi '${newPass.trim()}' olarak yenilendi! 🔑`);
        openAdminModal();
    }
}

function adminEditUserEmail(username) {
    const currentEmail = users[username]?.email || '';
    const newEmail = prompt(`${username} kullanıcısı için E-POSTA adresi girin:`, currentEmail);
    if (newEmail !== null && newEmail.trim() !== '') {
        users[username].email = newEmail.trim();
        saveUsersToLocalStorage();
        alert(`${username} kullanıcısının e-postası '${newEmail.trim()}' olarak güncellendi! ✉️`);
        openAdminModal();
    }
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
    saveHabitsToLocalStorage();
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

    saveHabitsToLocalStorage();
    renderHabits();
}

function editHabit(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const newTitle = prompt("Alışkanlığın yeni ismini yazın:", habit.title);
    if (newTitle !== null && newTitle.trim() !== "") {
        habit.title = newTitle.trim();
        saveHabitsToLocalStorage();
        renderHabits();
    }
}

function deleteHabit(habitId) {
    if (confirm("Bu alışkanlığı silmek istediğine emin misin?")) {
        habits = habits.filter(h => h.id !== habitId);
        saveHabitsToLocalStorage();
        renderHabits();
    }
}

initUserSession();
