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

// DIUBAH: Ditukar kepada fungsi global window supaya HTML/Browser boleh baca
window.loadDashboardData = function() {
    const walletsRef = ref(db, 'wallets');
    get(walletsRef).then((snapshot) => {
        if (!snapshot.exists()) {
            document.getElementById('player-table-body').innerHTML = `<tr><td colspan="6" style="text-align:center;">Tiada data pemain ditemui.</td></tr>`;
            return;
        }

        const data = snapshot.val();
        const tbody = document.getElementById('player-table-body');
        tbody.innerHTML = "";

        let totalPlayers = 0;
        let totalVaultAmount = 0;

        Object.keys(data).forEach((uid) => {
            const user = data[uid];
            totalPlayers++;
            totalVaultAmount += parseFloat(user.balance) || 0;

            const isBanned = user.status === 'banned';
            const statusHTML = isBanned ? `<span class="status-banned" style="color:red; font-weight:bold;">BANNED</span>` : `<span class="status-active" style="color:green; font-weight:bold;">ACTIVE</span>`;
            const banBtnHTML = isBanned ? 
                `<button class="btn btn-unban" onclick="changeUserStatus('${uid}', 'active')">UNBAN</button>` : 
                `<button class="btn btn-ban" onclick="changeUserStatus('${uid}', 'banned')">BAN</button>`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-size:11px; color:#00ffcc;">${uid}</td>
                <td><strong>${user.username || 'N/A'}</strong></td>
                <td>${user.email || '---'}</td>
                <td style="color:#00ff55; font-weight:bold;">RM ${(user.balance || 0).toFixed(2)}</td>
                <td>${statusHTML}</td>
                <td>
                    <button class="btn btn-add" onclick="openActionModal('${uid}', 'add', '${user.username}')">+ BAL</button>
                    <button class="btn btn-deduct" onclick="openActionModal('${uid}', 'deduct', '${user.username}')">- BAL</button>
                    <button class="btn btn-email" onclick="openActionModal('${uid}', 'email', '${user.username}')">📧 EMAIL</button>
                    ${banBtnHTML}
                </td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('total-players').textContent = totalPlayers;
        document.getElementById('total-vault').textContent = totalVaultAmount.toFixed(2);
    }).catch(err => console.error("Ralat database:", err));
}

// Kawalan Ban / Unban status pemain
window.changeUserStatus = function(uid, newStatus) {
    if(confirm(`Adakah anda pasti untuk menukar status pemain ini ke ${newStatus.toUpperCase()}?`)) {
        const userRef = ref(db, 'wallets/' + uid);
        update(userRef, { status: newStatus }).then(() => {
            alert("Status pemain berjaya dikemaskini!");
            window.loadDashboardData();
        });
    }
}

// Pengendali tetingkap Modal
window.openActionModal = function(uid, action, username) {
    activeTargetUid = uid;
    activeActionType = action;
    const modal = document.getElementById('admin-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body-content');
    
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
}

window.closeModal = function() {
    document.getElementById('admin-modal').style.display = 'none';
}

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
                closeModal();
                window.loadDashboardData();
            });

        } else if (activeActionType === 'email') {
            const sub = document.getElementById('email-subject').value;
            const msg = document.getElementById('email-msg').value;
            if(!sub || !msg) { alert("Sila lengkapkan subjek dan mesej!"); return; }
            
            alert(`Mesej Emel Berjaya Dihantar!\nKe: ${snapshot.val().email}\nSubjek: ${sub}`);
            closeModal();
        }
    });
}

// DIUBAH: Memastikan fungsi global dipanggil dengan selamat semasa onload
window.onload = function() {
    window.loadDashboardData();
};
