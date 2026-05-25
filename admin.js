import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBGIC0uvxEnAP2bpGnHi7BADI1y6cqorOI",
    authDomain: "webgame-c1f7d.firebaseapp.com",
    projectId: "webgame-c1f7d",
    storageBucket: "webgame-c1f7d.firebasestorage.app",
    messagingSenderId: "577183643543",
    appId: "1:577183643543:web:6444105e46ecd349b876d2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app, "https://webgame-c1f7d-default-rtdb-default-rtdb.firebaseio.com/");

let activeTargetUid = null;
let activeActionType = null; 

// 1. IKAT FUNGSI UTAMA PADA WINDOW (GLOBAL SCOPE)
window.loadDashboardData = function() {
    console.log("Memulakan penarikan data dari Firebase...");
    const walletsRef = ref(db, 'wallets');
    
    get(walletsRef).then((snapshot) => {
        const tbody = document.getElementById('player-table-body');
        if (!tbody) {
            console.error("Ralat: Elemen 'player-table-body' tidak dijumpai dalam HTML!");
            return;
        }

        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Tiada data pemain ditemui dalam nod /wallets/.</td></tr>`;
            return;
        }

        const data = snapshot.val();
        tbody.innerHTML = "";

        let totalPlayers = 0;
        let totalVaultAmount = 0;

        Object.keys(data).forEach((uid) => {
            const user = data[uid];
            totalPlayers++;
            totalVaultAmount += parseFloat(user.balance) || 0;

            const isBanned = user.status === 'banned';
            const statusHTML = isBanned ? `<span class="status-banned" style="color:#ff4444; font-weight:bold;">BANNED</span>` : `<span class="status-active" style="color:#00ff55; font-weight:bold;">ACTIVE</span>`;
            
            // Butang BAN/UNBAN dinamik
            const banBtnHTML = isBanned ? 
                `<button class="btn btn-unban" onclick="window.changeUserStatus('${uid}', 'active')">UNBAN</button>` : 
                `<button class="btn btn-ban" onclick="window.changeUserStatus('${uid}', 'banned')">BAN</button>`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-size:11px; color:#00ffcc; font-family:monospace;">${uid}</td>
                <td><strong>${user.username || 'N/A'}</strong></td>
                <td>${user.email || '---'}</td>
                <td style="color:#00ff55; font-weight:bold;">RM ${(user.balance || 0).toFixed(2)}</td>
                <td>${statusHTML}</td>
                <td>
                    <button class="btn btn-add" onclick="window.openActionModal('${uid}', 'add', '${user.username || 'Player'}')">+ BAL</button>
                    <button class="btn btn-deduct" onclick="window.openActionModal('${uid}', 'deduct', '${user.username || 'Player'}')">- BAL</button>
                    <button class="btn btn-email" onclick="window.openActionModal('${uid}', 'email', '${user.username || 'Player'}')">📧 EMAIL</button>
                    ${banBtnHTML}
                </td>
            `;
            tbody.appendChild(row);
        });

        // Kemaskini kad statistik
        const txtPlayers = document.getElementById('total-players');
        const txtVault = document.getElementById('total-vault');
        
        if (txtPlayers) txtPlayers.textContent = totalPlayers;
        if (txtVault) txtVault.textContent = totalVaultAmount.toFixed(2);
        
        console.log("Data berjaya dimuatkan! Jumlah pemain:", totalPlayers);

    }).catch(err => {
        console.error("Ralat kritikal semasa membaca Database:", err);
        alert("Ralat Database: " + err.message);
    });
};

// 2. IKAT FUNGSI STATUS (BAN/UNBAN) PADA WINDOW
window.changeUserStatus = function(uid, newStatus) {
    if(confirm(`Adakah anda pasti untuk menukar status pemain ini ke ${newStatus.toUpperCase()}?`)) {
        const userRef = ref(db, 'wallets/' + uid);
        update(userRef, { status: newStatus }).then(() => {
            alert("Status pemain berjaya dikemaskini!");
            window.loadDashboardData();
        }).catch(err => console.error("Gagal menukar status:", err));
    }
};

// 3. IKAT FUNGSI MODAL PADA WINDOW
window.openActionModal = function(uid, action, username) {
    activeTargetUid = uid;
    activeActionType = action;
    const modal = document.getElementById('admin-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body-content');
    
    if (!modal || !title || !body) {
        console.error("Ralat: Struktur elemen modal dalam HTML tidak lengkap!");
        return;
    }

    modal.style.display = 'flex';
    body.innerHTML = "";

    if (action === 'add') {
        title.textContent = `Tambah Kredit: ${username}`;
        body.innerHTML = `<label>Amaun Nilai Tambah (RM):</label><input type="number" id="modal-input-amount" step="0.01" placeholder="Masukkan nilai Contoh: 50.00">`;
    } else if (action === 'deduct') {
        title.textContent = `Tolak Kredit: ${username}`;
        body.innerHTML = `<label>Amaun Nilai Tolak (RM):</label><input type="number" id="modal-input-amount" step="0.01" placeholder="Masukkan nilai Contoh: 20.00">`;
    } else if (action === 'email') {
        title.textContent = `Hantar Emel Rasmi Ke: ${username}`;
        body.innerHTML = `
            <label>Subjek Mesej:</label><input type="text" id="email-subject" placeholder="Tajuk Emel">
            <label>Kandungan Mesej:</label><textarea id="email-msg" rows="4" placeholder="Tulis mesej pengumuman anda di sini..."></textarea>
        `;
    }
};

window.closeModal = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'none';
};

window.executeModalAction = function() {
    if (!activeTargetUid) return;
    const userRef = ref(db, 'wallets/' + activeTargetUid);

    get(userRef).then((snapshot) => {
        if (!snapshot.exists()) return;
        const currentBalance = parseFloat(snapshot.val().balance) || 0;

        if (activeActionType === 'add' || activeActionType === 'deduct') {
            const valInput = parseFloat(document.getElementById('modal-input-amount').value);
            if (isNaN(valInput) || valInput <= 0) {
                alert("Sila masukkan amaun angka yang sah!");
                return;
            }

            let newBalance = currentBalance;
            if (activeActionType === 'add') newBalance += valInput;
            if (activeActionType === 'deduct') newBalance = Math.max(0, currentBalance - valInput);

            update(userRef, { balance: newBalance }).then(() => {
                alert("Transaksi baki berjaya dikemaskini!");
                window.closeModal();
                window.loadDashboardData();
            });

        } else if (activeActionType === 'email') {
            const sub = document.getElementById('email-subject').value;
            const msg = document.getElementById('email-msg').value;
            if(!sub || !msg) { alert("Sila lengkapkan subjek dan mesej!"); return; }
            
            alert(`Mesej Emel Berjaya Dihantar!\nKe: ${snapshot.val().email}\nSubjek: ${sub}`);
            window.closeModal();
        }
    }).catch(err => console.error("Gagal melaksanakan tindakan modal:", err));
};

// 4. JALANKAN SEBAIK SAHAJA WINDOW DI-REFRESH
window.onload = function() {
    window.loadDashboardData();
};
