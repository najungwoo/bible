// --- Add Day Modal Logic ---
const btnAddDay = document.getElementById('btnAddDay');
const addDayModal = document.getElementById('addDayModal');
const closeAddDay = document.getElementById('closeAddDay');
const btnSaveDay = document.getElementById('btnSaveDay');
const newDayTitle = document.getElementById('newDayTitle');

if (btnAddDay) {
    btnAddDay.addEventListener('click', () => {
        addDayModal.style.display = "flex";
        newDayTitle.value = "";
        newDayTitle.focus();
    });
}

if (closeAddDay) {
    closeAddDay.addEventListener('click', () => {
        addDayModal.style.display = "none";
    });
}

if (btnSaveDay) {
    btnSaveDay.addEventListener('click', () => {
        const title = newDayTitle.value.trim();
        if (!title) {
            if (typeof customAlert === 'function') customAlert("일차 제목을 입력해주세요.");
            else alert("일차 제목을 입력해주세요.");
            return;
        }

        // Create new empty day
        originalScriptures.push([]);
        originalFilenames.push(title);
        saveDataToStorage();

        // Update dropdowns
        if (typeof updateDayDropdown === 'function') updateDayDropdown();

        // Select the new day
        const newIndex = originalScriptures.length - 1;
        daySelect.value = newIndex;
        if (typeof selectDay === 'function') selectDay(newIndex);
        if (typeof updateDayDropdown === 'function') updateDayDropdown(); // update again to reflect selection?

        addDayModal.style.display = "none";
    });
}

// --- Add Verse Modal Logic ---
const btnOpenAddVerse = document.getElementById('btnOpenAddVerse');
const addVerseModal = document.getElementById('addVerseModal');
const closeAddVerse = document.getElementById('closeAddVerse');
const targetDaySelect = document.getElementById('targetDaySelect');
const btnAddVerseToDay = document.getElementById('btnAddVerseToDay');
const inputRef = document.getElementById('inputRef');
const inputVerse = document.getElementById('inputVerse');
const inputLevel = document.getElementById('inputLevel');

if (btnOpenAddVerse) {
    btnOpenAddVerse.addEventListener('click', () => {
        // Populate target day select
        targetDaySelect.innerHTML = '<option value="" disabled selected>일차 선택</option>';
        originalFilenames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = name.replace('.txt', '');
            targetDaySelect.appendChild(option);
        });

        // Pre-select current day if valid
        if (currentDayIndex !== -1) {
            targetDaySelect.value = currentDayIndex;
        }

        addVerseModal.style.display = "flex";
        inputRef.value = "";
        inputVerse.value = "";
        inputRef.focus();
    });
}

if (closeAddVerse) {
    closeAddVerse.addEventListener('click', () => {
        addVerseModal.style.display = "none";
    });
}

if (btnAddVerseToDay) {
    btnAddVerseToDay.addEventListener('click', () => {
        const targetIndex = parseInt(targetDaySelect.value);
        const ref = inputRef.value.trim();
        const text = inputVerse.value.trim();
        // inputLevel might be missing in some versions if not used, but kept for compatibility
        const level = inputLevel ? inputLevel.value : "1";

        if (isNaN(targetIndex)) {
            if (typeof customAlert === 'function') customAlert("추가할 일차를 선택해주세요.");
            else alert("추가할 일차를 선택해주세요.");
            return;
        }
        if (!ref || !text) {
            if (typeof customAlert === 'function') customAlert("장절과 내용을 모두 입력해주세요.");
            else alert("장절과 내용을 모두 입력해주세요.");
            return;
        }

        // Format: "1(요 3:16)^하나님이..."
        const formatted = `${level}(${ref})^${text}`;

        originalScriptures[targetIndex].push(formatted);
        saveDataToStorage();

        if (targetIndex === currentDayIndex) {
            if (typeof dayReset === 'function') dayReset();
        }

        if (typeof customAlert === 'function') customAlert("구절이 추가되었습니다.");
        else alert("구절이 추가되었습니다.");
        addVerseModal.style.display = "none";
    });
}


// --- Delete Verse Logic ---
const btnOpenDeleteVerse = document.getElementById('btnOpenDeleteVerse');
const deleteVerseModal = document.getElementById('deleteVerseModal');
const closeDeleteVerse = document.getElementById('closeDeleteVerse');
const deleteDaySelect = document.getElementById('deleteDaySelect');
const deleteVerseList = document.getElementById('deleteVerseList');

if (btnOpenDeleteVerse) {
    btnOpenDeleteVerse.addEventListener('click', () => {
        deleteVerseModal.style.display = 'flex';
        // Populate days
        deleteDaySelect.innerHTML = '<option value="" disabled selected>일차 선택</option>';
        originalFilenames.forEach((name, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = name.replace('.txt', '');
            deleteDaySelect.appendChild(opt);
        });

        // If current day is valid, select it
        if (currentDayIndex !== -1) {
            deleteDaySelect.value = currentDayIndex;
            renderDeleteVerseList();
        } else {
            deleteVerseList.innerHTML = '';
        }
    });
}

if (closeDeleteVerse) {
    closeDeleteVerse.addEventListener('click', () => deleteVerseModal.style.display = 'none');
}

if (deleteDaySelect) {
    deleteDaySelect.addEventListener('change', renderDeleteVerseList);
}

function renderDeleteVerseList() {
    deleteVerseList.innerHTML = '';
    const dayIdx = parseInt(deleteDaySelect.value);
    if (isNaN(dayIdx)) return;

    const verses = originalScriptures[dayIdx];
    verses.forEach((line, vIdx) => {
        // attempt to parse user friendly view
        // line ex: "1(요 3:16)^text"
        let display = line;
        const levelMatch = line.match(/^(\d+)\\/);
        let clean = line;
        if (levelMatch) clean = line.substring(levelMatch[0].length);
        const parts = clean.split('^');
        if (parts.length >= 2) {
            display = parts[0] + " " + parts[1].substring(0, 10) + "...";
        }

        const div = document.createElement('div');
        div.className = 'delete-item';
        div.innerHTML = `
            <span>${display}</span>
            <button class="btn-delete" onclick="deleteVerse(${dayIdx}, ${vIdx})">삭제</button>
        `;
        deleteVerseList.appendChild(div);
    });
}

// Global function (needed for onclick attribute)
window.deleteVerse = function (dayIdx, vIdx) {
    if (typeof customConfirm === 'function') {
        customConfirm("정말로 삭제하시겠습니까?", () => {
            originalScriptures[dayIdx].splice(vIdx, 1);
            saveDataToStorage();
            renderDeleteVerseList();
            if (dayIdx === currentDayIndex) {
                if (typeof dayReset === 'function') dayReset();
            }
        });
    } else {
        if (confirm("정말로 삭제하시겠습니까?")) {
            originalScriptures[dayIdx].splice(vIdx, 1);
            saveDataToStorage();
            renderDeleteVerseList();
            if (dayIdx === currentDayIndex) {
                if (typeof dayReset === 'function') dayReset();
            }
        }
    }
};

// --- Delete Day Logic ---
const btnDelete = document.getElementById('btnDelete');
const deleteDayModal = document.getElementById('deleteDayModal');
const deleteDayMessage = document.getElementById('deleteDayMessage');
const btnCancelDeleteDay = document.getElementById('btnCancelDeleteDay');
const btnConfirmDeleteDay = document.getElementById('btnConfirmDeleteDay');
const closeDeleteDay = document.getElementById('closeDeleteDay');

if (btnDelete) {
    btnDelete.addEventListener('click', () => {
        if (currentDayIndex === -1) {
            if (typeof customAlert === 'function') customAlert("삭제할 일차를 선택해주세요.");
            else alert("삭제할 일차를 선택해주세요.");
            return;
        }
        deleteDayMessage.textContent = `현재 선택된 일차(${originalFilenames[currentDayIndex]})를 삭제하시겠습니까?`;
        deleteDayModal.style.display = 'flex';
    });
}

if (closeDeleteDay) closeDeleteDay.addEventListener('click', () => deleteDayModal.style.display = 'none');
if (btnCancelDeleteDay) btnCancelDeleteDay.addEventListener('click', () => deleteDayModal.style.display = 'none');

if (btnConfirmDeleteDay) {
    btnConfirmDeleteDay.addEventListener('click', () => {
        originalScriptures.splice(currentDayIndex, 1);
        originalFilenames.splice(currentDayIndex, 1);
        saveDataToStorage();

        // Update Dropdown
        if (typeof updateDayDropdown === 'function') updateDayDropdown();

        // Check bounds
        if (originalScriptures.length === 0) {
            currentDayIndex = -1;
            daySelect.value = "";
            if (typeof dayReset === 'function') dayReset();
        } else {
            // Select previous day or first day
            let newIndex = Math.max(0, currentDayIndex - 1);
            if (newIndex >= originalScriptures.length) newIndex = originalScriptures.length - 1;
            daySelect.value = newIndex;
            if (typeof selectDay === 'function') selectDay(newIndex);
        }

        deleteDayModal.style.display = 'none';
        if (typeof customAlert === 'function') customAlert("삭제되었습니다.");
        else alert("삭제되었습니다.");
    });
}

// --- Close Modals on Outside Click (Editor Specific) ---
window.addEventListener('click', (e) => {
    if (addDayModal && e.target === addDayModal) addDayModal.style.display = 'none';
    if (addVerseModal && e.target === addVerseModal) addVerseModal.style.display = 'none';
    if (deleteDayModal && e.target === deleteDayModal) deleteDayModal.style.display = 'none';
    if (deleteVerseModal && e.target === deleteVerseModal) deleteVerseModal.style.display = 'none';
});
