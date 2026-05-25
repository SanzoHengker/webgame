// ========================================================
// 1. FIREBASE AUTH & REALTIME DATABASE INTEGRATION
// ========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBGIC0uvxEnAP2bpGnHi7BADI1y6cqorOI",
    authDomain: "webgame-c1f7d.firebaseapp.com",
    projectId: "webgame-c1f7d",
    storageBucket: "webgame-c1f7d.firebasestorage.app",
    messagingSenderId: "577183643543",
    appId: "1:577183643543:web:6444105e46ecd349b876d2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// LINK DATABASE UTAMA ANDA YANG BARU
const databaseURL = "https://webgame-c1f7d-default-rtdb.firebaseio.com/"; 
const db = getDatabase(app, databaseURL);

let currentUser = null;

// Saring sesi & tarik baki dompet berserta maklumat profil komprehensif
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "auth.html";
    } else {
        currentUser = user;
        console.log("Sesi aktif disahkan:", user.email);
        
        // Isikan ID Unik terus ke struktur tetingkap modal profil
        document.getElementById('prof-uid').textContent = user.uid;
        document.getElementById('prof-email').textContent = user.email;

        const userWalletRef = ref(db, 'wallets/' + user.uid);
        try {
            const snapshot = await get(userWalletRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                balance = data.balance;
                
                // Masukkan nama username ke tetingkap modal sekiranya wujud
                document.getElementById('prof-username').textContent = data.username ? data.username : "Tiada Tetapan";
                console.log("Kredit ditarik dari DB: RM", balance);
            } else {
                // Kecemasan (Fallback sekiranya daftar dari kaedah alternatif tanpa melintasi auth form)
                balance = 1000.00;
                document.getElementById('prof-username').textContent = "Pemain_Baru";
                await set(userWalletRef, {
                    email: user.email,
                    username: "Pemain_Baru",
                    balance: balance
                });
            }
            
            updatePanelValues();
            
            const winMessage = document.getElementById('win-message');
            if(winMessage) {
                winMessage.textContent = "KREDIT DI-LOAD! SILA PILIH BET DAN TEKAN SPIN";
            }
        } catch (error) {
            console.error("Ralat komunikasi pangkalan data:", error);
        }
    }
});

// Kemas kini baki kredit awan
async function syncBalanceToDatabase() {
    if (!currentUser) return;
    const userWalletRef = ref(db, 'wallets/' + currentUser.uid);
    try {
        await update(userWalletRef, {
            balance: parseFloat(balance.toFixed(2))
        });
    } catch (error) {
        console.error("Gagal mengemaskini baki awan:", error);
    }
}

// Pengurusan Tetingkap Modal Profil
window.toggleProfileModal = function(show) {
    const profileOverlay = document.getElementById('profile-overlay');
    if(profileOverlay) {
        profileOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Menguruskan Log Keluar Pemain
window.handleLogout = function() {
    if (confirm("Adakah anda pasti mahu keluar dari kabinet slot?")) {
        signOut(auth).then(() => {
            window.location.href = "auth.html";
        }).catch((error) => {
            alert("Ralat sistem keluar: " + error.message);
        });
    }
}

// ========================================================
// 2. ENJIN AUDIO AUDIO CONTEXT SYNTHESIS
// ========================================================
const AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    playSpin() {
        this.init(); let now = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); let gain = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(65, now + 0.2);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.22);
    },
    playStopCell() {
        this.init(); let now = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); let gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(160, now);
        gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.07);
    },
    playNormalWin() {
        this.init(); let now = this.ctx.currentTime;
        let notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            let osc = this.ctx.createOscillator(); let gain = this.ctx.createGain();
            let time = now + (idx * 0.06);
            osc.type = 'square'; osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.08, time); gain.gain.exponentialRampToValueAtTime(0.004, time + 0.12);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(time); osc.stop(time + 0.12);
        });
    },
    playBigWinLoop(dur = 3.0) {
        this.init(); let now = this.ctx.currentTime; let step = 0.08;
        for (let t = 0; t < dur; t += step) {
            let osc = this.ctx.createOscillator(); let gain = this.ctx.createGain();
            let base = (t % 0.24 < 0.12) ? 880 : 1320;
            osc.type = 'square'; osc.frequency.setValueAtTime(base + (Math.random() * 30), now + t);
            gain.gain.setValueAtTime(0.06, now + t); gain.gain.exponentialRampToValueAtTime(0.004, now + t + step);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now + t); osc.stop(now + t + step);
        }
    },
    playJackpotSiren() {
        this.init(); let now = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); let gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(650, now);
        for(let i=0; i<2.0; i+=0.2) {
            osc.frequency.linearRampToValueAtTime(950, now + i + 0.1);
            osc.frequency.linearRampToValueAtTime(650, now + i + 0.2);
        }
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 2.0);
    }
};

// ========================================================
// 3. MATEMATIK & DATA SLOT
// ========================================================
const WILD_SYMBOL = '🃏';
const SCATTER_SYMBOL = 'FREE';

const normalSymbolsPool = ['🐉', '👑', '💎', 'TURTLE', '💰', '🍊', '7️⃣', 'BAR', '🍒', WILD_SYMBOL];

const symbolsConfig = [
    { icon: WILD_SYMBOL, multiplier: [0, 0, 0] },
    { icon: SCATTER_SYMBOL, multiplier: [0, 0, 0] }, 
    { icon: '🐉', multiplier: [30, 150, 800] }, 
    { icon: '👑', multiplier: [20, 100, 500] }, 
    { icon: '💎', multiplier: [15, 75, 350] },
    { icon: 'TURTLE', multiplier: [12, 60, 250] },  
    { icon: '💰', multiplier: [10, 45, 180] },
    { icon: '🍊', multiplier: [8, 30, 120] },
    { icon: '7️⃣', multiplier: [5, 20, 90] },   
    { icon: 'BAR', multiplier: [3, 15, 60] },
    { icon: '🍒', multiplier: [2, 10, 40] }
];

const paylinesPattern = [
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0],
    [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2],
    [0, 2, 2, 2, 0], [2, 0, 0, 0, 2], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 2],
    [2, 1, 1, 1, 0]
];

// STATE GAME
let balance = 0.00; 
let currentBetPerLine = 0.20;
let currentLines = 21;
let isSpinning = false;
let matrixResult = [[], [], [], [], []]; 

let isAutoSpinActive = false;
let autoSpinRemaining = 0;
let isFreeSpinMode = false;
let freeSpinsRemaining = 0;
let accumulatedFreeSpinWin = 0; 

let presetScatterPositions = [-1, -1, -1]; 

// DOM CACHING
const winMessage = document.getElementById('win-message');
const balanceDisplay = document.getElementById('display-balance');
const linesDisplay = document.getElementById('display-lines');
const betDisplay = document.getElementById('display-bet');
const totalBetDisplay = document.getElementById('display-total-bet');
const winDisplay = document.getElementById('display-win');
const spinButton = document.getElementById('spin-btn');
const autoButton = document.getElementById('auto-btn');
const autoSelect = document.getElementById('auto-spin-count');
const fsBanner = document.getElementById('fs-banner');
const fsCountDisplay = document.getElementById('fs-count');
const canvas = document.getElementById('line-canvas');
const ctx = canvas.getContext('2d');

const bigWinOverlay = document.getElementById('big-win-overlay');
const overlayAmount = document.getElementById('overlay-amount');

window.changeLines = function(direction) {
    if (isSpinning || isAutoSpinActive || isFreeSpinMode) return;
    currentLines += direction;
    if (currentLines < 1) currentLines = 1;
    if (currentLines > 21) currentLines = 21;
    updatePanelValues();
}

window.changeBet = function(amount) {
    if (isSpinning || isAutoSpinActive || isFreeSpinMode) return;
    currentBetPerLine += amount;
    if (currentBetPerLine < 0.10) currentBetPerLine = 0.10;
    if (currentBetPerLine > 10.00) currentBetPerLine = 10.00;
    updatePanelValues();
}

window.toggleAutoSpin = function() {
    if (isSpinning) return;
    if (isAutoSpinActive) {
        stopAutoSpin();
    } else {
        isAutoSpinActive = true;
        autoSpinRemaining = parseInt(autoSelect.value);
        autoButton.textContent = "STOP";
        autoButton.classList.add('active');
        autoSelect.disabled = true;
        startSpin();
    }
}

window.startSpin = async function() {
    if (isSpinning) return;

    const totalCost = currentBetPerLine * currentLines;
    if (!isFreeSpinMode) {
        if (balance < totalCost) {
            winMessage.textContent = "SALDO KURANG! AUTO PLAY DIHENTIKAN.";
            stopAutoSpin();
            return;
        }
        balance -= totalCost;
        winDisplay.textContent = "0.00"; 
        await syncBalanceToDatabase();
    } else {
        freeSpinsRemaining--;
        fsCountDisplay.textContent = freeSpinsRemaining;
    }

    isSpinning = true;
    spinButton.disabled = true;
    winMessage.textContent = isFreeSpinMode ? "FREE SPIN SEDANG BERJALAN..." : "REEL BERPUTAR...";
    clearCanvas();
    updatePanelValues();

    AudioEngine.playSpin();

    let baseChance = 0.28;
    if (isFreeSpinMode) {
        baseChance = baseChance * (1 - 0.85); 
    }

    for (let row = 0; row < 3; row++) {
        if (Math.random() < baseChance) { 
            presetScatterPositions[row] = Math.floor(Math.random() * 5); 
        } else {
            presetScatterPositions[row] = -1; 
        }
    }

    let intervals = [];
    for (let reel = 0; reel < 5; reel++) {
        for(let r=0; r<3; r++) {
            let cell = document.getElementById(`c-${reel}-${r}`);
            if(cell) cell.classList.remove('text-free');
        }
        
        intervals[reel] = setInterval(() => {
            for (let row = 0; row < 3; row++) {
                let cell = document.getElementById(`c-${reel}-${row}`);
                if(!cell) continue;
                cell.classList.add('spinning');
                
                if (Math.random() < 0.1) {
                    cell.textContent = SCATTER_SYMBOL;
                    cell.classList.add('text-free');
                } else {
                    let pool = ['🐉', '👑', '💎', '💰', '🍊', '7️⃣', 'BAR', '🍒'];
                    cell.textContent = pool[Math.floor(Math.random() * pool.length)];
                    cell.classList.remove('text-free');
                }
            }
        }, 60);
    }

    function stopReelSequentially(reelIndex) {
        if (reelIndex >= 5) {
            calculateResults();
            return;
        }

        setTimeout(() => {
            clearInterval(intervals[reelIndex]);
            AudioEngine.playStopCell();

            for (let row = 0; row < 3; row++) {
                const cell = document.getElementById(`c-${reelIndex}-${row}`);
                if(!cell) continue;
                cell.classList.remove('spinning');
                
                let finalSymbol;
                if (presetScatterPositions[row] === reelIndex) {
                    finalSymbol = SCATTER_SYMBOL;
                    cell.classList.add('text-free');
                } else {
                    let filteredPool = normalSymbolsPool;
                    finalSymbol = filteredPool[Math.floor(Math.random() * filteredPool.length)];
                    cell.classList.remove('text-free');
                }

                cell.textContent = (finalSymbol === 'TURTLE') ? '🐢' : finalSymbol;
                matrixResult[reelIndex][row] = finalSymbol;
            }
            stopReelSequentially(reelIndex + 1);
        }, 400);
    }
    stopReelSequentially(0);
}

window.closeOverlay = function() {
    bigWinOverlay.style.display = 'none';
    continueGameFlow();
}

function updatePanelValues() {
    let totalBet = currentBetPerLine * currentLines;
    if(totalBetDisplay) totalBetDisplay.textContent = totalBet.toFixed(2);
    if(betDisplay) betDisplay.textContent = currentBetPerLine.toFixed(2);
    if(linesDisplay) linesDisplay.textContent = currentLines;
    if(balanceDisplay) balanceDisplay.textContent = balance.toFixed(2);
}

function stopAutoSpin() {
    isAutoSpinActive = false;
    autoSpinRemaining = 0;
    autoButton.textContent = "AUTO PLAY";
    autoButton.classList.remove('active');
    autoSelect.disabled = false;
}

async function calculateResults() {
    let currentSpinWin = 0;
    let winningLines = [];
    let scatterCount = 0;

    for (let reel = 0; reel < 5; reel++) {
        for (let row = 0; row < 3; row++) {
            if (matrixResult[reel][row] === SCATTER_SYMBOL) scatterCount++;
        }
    }

    for (let i = 0; i < currentLines; i++) {
        const pattern = paylinesPattern[i];
        let firstSymbol = matrixResult[0][pattern[0]];
        let targetSymbol = firstSymbol;

        if (targetSymbol === WILD_SYMBOL) {
            for (let r = 1; r < 5; r++) {
                if (matrixResult[r][pattern[r]] !== WILD_SYMBOL) {
                    targetSymbol = matrixResult[r][pattern[r]];
                    break;
                }
            }
        }

        if (targetSymbol === WILD_SYMBOL || targetSymbol === SCATTER_SYMBOL) {
            targetSymbol = '🐉'; 
        }

        let matchCount = 1;
        for (let reel = 1; reel < 5; reel++) {
            const currentSymbol = matrixResult[reel][pattern[reel]];
            if (currentSymbol === targetSymbol || currentSymbol === WILD_SYMBOL) {
                matchCount++;
            } else {
                break;
            }
        }

        if (matchCount >= 3) {
            const symbolObj = symbolsConfig.find(s => s.icon === targetSymbol);
            const payoutMultiplier = symbolObj.multiplier[matchCount - 3];
            let lineWinValue = currentBetPerLine * payoutMultiplier; 
            currentSpinWin += lineWinValue;
            winningLines.push({ lineIndex: i, pattern: pattern });
        }
    }

    if (isFreeSpinMode) {
        currentSpinWin *= 2; 
        accumulatedFreeSpinWin += currentSpinWin; 
        winDisplay.textContent = accumulatedFreeSpinWin.toFixed(2); 
    } else {
        if (currentSpinWin > 0) {
            winDisplay.textContent = currentSpinWin.toFixed(2);
        }
    }

    balance += currentSpinWin;
    await syncBalanceToDatabase();

    if (currentSpinWin > 0) {
        drawWinningLines(winningLines);
        const totalCost = currentBetPerLine * currentLines;
        if (currentSpinWin >= (totalCost * 8)) {
            overlayAmount.textContent = `RM ${currentSpinWin.toFixed(2)}`;
            bigWinOverlay.style.display = 'flex';
            AudioEngine.playBigWinLoop(3.0);
        } else {
            AudioEngine.playNormalWin();
            winMessage.textContent = `MENANG TALIAN: RM ${currentSpinWin.toFixed(2)}!!`;
        }
    } else {
        if(!isFreeSpinMode) winMessage.textContent = "CUBA LAGI!";
        else winMessage.textContent = "FREE SPIN TIADA HIT, MATA TERKUMPUL KEKAL DI-HOLD.";
    }

    if (scatterCount >= 3) {
        freeSpinsRemaining += 7; 
        isFreeSpinMode = true;
        if (accumulatedFreeSpinWin === 0) accumulatedFreeSpinWin = currentSpinWin;
        fsBanner.style.display = 'block';
        fsCountDisplay.textContent = freeSpinsRemaining;
        AudioEngine.playJackpotSiren();
    }

    isSpinning = false;
    spinButton.disabled = false;
    updatePanelValues();

    if (bigWinOverlay.style.display !== 'flex') {
        continueGameFlow();
    }
}

function continueGameFlow() {
    if (isFreeSpinMode && freeSpinsRemaining > 0) {
        setTimeout(startSpin, 1400); 
    } else if (isFreeSpinMode && freeSpinsRemaining === 0) {
        isFreeSpinMode = false;
        fsBanner.style.display = 'none';
        winMessage.textContent = `BONUS TAMAT! TOTAL KEMENANGAN FREE SPIN: RM ${accumulatedFreeSpinWin.toFixed(2)}`;
        accumulatedFreeSpinWin = 0; 
        evaluateNextAutoPlay();
    } else {
        evaluateNextAutoPlay();
    }
}

function evaluateNextAutoPlay() {
    if (isAutoSpinActive) {
        if (autoSpinRemaining > 1) {
            if (autoSpinRemaining < 999) autoSpinRemaining--;
            setTimeout(startSpin, 1200);
        } else {
            stopAutoSpin();
            winMessage.textContent = "AUTO PLAY SELESAI.";
        }
    }
}

function drawWinningLines(winningLines) {
    setupCanvasSize();
    const cellWidth = canvas.clientWidth / 5;
    const cellHeight = canvas.clientHeight / 3;

    winningLines.forEach((win, index) => {
        ctx.beginPath();
        ctx.lineWidth = 4;
        const colors = ['#00ffcc', '#ff0055', '#ffcc00', '#00ff00', '#ff00ff'];
        ctx.strokeStyle = colors[index % colors.length];

        let points = [];
        for (let reel = 0; reel < 5; reel++) {
            let x = (reel * cellWidth) + (cellWidth / 2);
            let y = (win.pattern[reel] * cellHeight) + (cellHeight / 2);
            points.push({ x: x, y: y, isWild: (matrixResult[reel][win.pattern[reel]] === WILD_SYMBOL) });
        }

        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
    });
}

function setupCanvasSize() { if(canvas) { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; } }
function clearCanvas() { if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); }

setInterval(() => {
    let gc = document.getElementById('grand-counter');
    if(gc) {
        let cur = parseFloat(gc.textContent.replace(/[^0-9.-]+/g,""));
        gc.textContent = "RM " + (cur + Math.random() * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2 });
    }
}, 900);

updatePanelValues();