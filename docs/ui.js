// --- Generic Modal Logic ---
const genericAlertModal = document.getElementById('genericAlertModal');
const genericAlertMessage = document.getElementById('genericAlertMessage');
const btnGenericAlertClose = document.getElementById('btnGenericAlertClose');

const genericConfirmModal = document.getElementById('genericConfirmModal');
const genericConfirmMessage = document.getElementById('genericConfirmMessage');
const btnGenericConfirmCancel = document.getElementById('btnGenericConfirmCancel');
const btnGenericConfirmOk = document.getElementById('btnGenericConfirmOk');

let onConfirmCallback = null;

function customAlert(msg) {
    if (!genericAlertModal) {
        alert(msg);
        return;
    }
    genericAlertMessage.textContent = msg;
    genericAlertModal.style.display = 'flex';
}

if (btnGenericAlertClose) {
    btnGenericAlertClose.addEventListener('click', () => {
        genericAlertModal.style.display = 'none';
    });
}

function customConfirm(msg, callback) {
    if (!genericConfirmModal) {
        if (confirm(msg)) callback();
        return;
    }
    genericConfirmMessage.textContent = msg;
    onConfirmCallback = callback;
    genericConfirmModal.style.display = 'flex';
}

if (btnGenericConfirmCancel) {
    btnGenericConfirmCancel.addEventListener('click', () => {
        genericConfirmModal.style.display = 'none';
        onConfirmCallback = null;
    });
}

if (btnGenericConfirmOk) {
    btnGenericConfirmOk.addEventListener('click', () => {
        if (onConfirmCallback) onConfirmCallback();
        genericConfirmModal.style.display = 'none';
        onConfirmCallback = null;
    });
}

// Close generic modals on outside click
window.addEventListener('click', (e) => {
    if (e.target === genericAlertModal) genericAlertModal.style.display = 'none';
    if (e.target === genericConfirmModal) genericConfirmModal.style.display = 'none';
});
