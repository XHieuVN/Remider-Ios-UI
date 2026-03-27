// 1. BIẾN TOÀN CỤC CHO LỜI NHẮC
let reminderViewDate = new Date();
let activeReminderDateTarget = null;
let isTaskCompleted = false; // Biến tạm để theo dõi trạng thái trong Modal
// 2. KHỞI TẠO
document.addEventListener('DOMContentLoaded', function() {
    initReminderWheels();
});

// hàm reset table add thêm reminder
function resetReminderForm() {
    // 1. Reset các ô nhập liệu (Tiêu đề & Ghi chú)
    const container = document.getElementById("reminder-fields");
    container.querySelector('.ios-input').value = "";
    container.querySelector('.ios-textarea').value = "";
    document.querySelector('.btn-add').innerText = "Thêm"
    // 2. Reset Ngày về mặc định (Ngày hiện tại)
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear().toString(); // Lấy 2 số cuối của năm
    
    const formattedDate = `${d}/${m}/${y}`;
    document.getElementById('reminder-date-display').innerText = formattedDate;
    document.getElementById('reminder-time-display').innerText = "00:00"; // Hoặc giờ hiện tại

    // 3. Reset Trạng thái về "Chưa làm"
    isTaskCompleted = false; // Biến toàn cục theo dõi trạng thái
    const textElement = document.getElementById("completion-status-text");
    const iconBg = document.getElementById("status-icon-bg");

    if (textElement && iconBg) {
        textElement.innerText = "[x] chưa làm";
        textElement.className = "status-text overdue"; // Màu đỏ
        iconBg.className = "icon-bg gray";             // Màu xám
    }

    // 4. Đóng các bộ chọn (Picker) nếu đang mở
    const datePicker = document.getElementById('reminder-calendar');
    const timePicker = document.getElementById('reminder-time-picker');
    const earlyPicker = document.getElementById('reminder-early-picker-container');
    
    if (datePicker) datePicker.style.display = 'none';
    if (timePicker) timePicker.classList.remove('show');
    if (earlyPicker) earlyPicker.classList.remove('show');
}

function toggleCompletionStatus() {
    isTaskCompleted = !isTaskCompleted;
    const textElement = document.getElementById("completion-status-text");
    const iconBg = document.getElementById("status-icon-bg");

    if (isTaskCompleted) {
        textElement.innerText = "[v] đã làm";
        textElement.className = "status-text completed";
        iconBg.className = "icon-bg success-green";
    } else {
        textElement.innerText = "[x] chưa làm";
        textElement.className = "status-text overdue";
        iconBg.className = "icon-bg gray";
    }
}

function initReminderWheels() {
    // Giờ nhắc nhở
    const rHour = document.getElementById('hour-wheel-reminder');
    const rMin = document.getElementById('minute-wheel-reminder');
    if (rHour && rMin) {
        for(let i=0; i<24; i++) createPickerItem(i.toString().padStart(2, '0'), rHour);
        for(let i=0; i<60; i++) createPickerItem(i.toString().padStart(2, '0'), rMin);
        setupPickerScroll(rHour, updateReminderTimeDisplay);
        setupPickerScroll(rMin, updateReminderTimeDisplay);
    }

    // Lời nhắc sớm
    const eNum = document.getElementById('reminder-early-number-wheel');
    const eUnit = document.getElementById('reminder-early-unit-wheel');
    if (eNum && eUnit) {
        for(let i=1; i<=30; i++) createPickerItem(i, eNum);
        ["Phút", "Giờ", "Ngày", "Tuần"].forEach(u => createPickerItem(u, eUnit));
        setupPickerScroll(eNum, updateReminderEarlyDisplay);
        setupPickerScroll(eUnit, updateReminderEarlyDisplay);
    }
}

// Mở lịch Lời nhắc
function openDatePicker(targetId) {
    activeReminderDateTarget = document.getElementById(targetId);
    const picker = document.getElementById('reminder-calendar');
    
    // Đóng các cái khác
    document.getElementById('reminder-time-picker').classList.remove('show');
    
    if (picker.style.display === 'block') {
        picker.style.display = 'none';
    } else {
        picker.style.display = 'block';
        renderReminderCalendar();
    }
}

function renderReminderCalendar() {
    const container = document.getElementById('calendar-days-reminder');
    const label = document.getElementById('current-month-year-reminder');

    renderUniversalCalendar(container, label, reminderViewDate, (day, month, year) => {
        
        activeReminderDateTarget.innerText = `${day}/${month + 1}/${year}`;
        document.getElementById('reminder-calendar').style.display = 'none';
    });
}

function changeMonth(offset) {
    reminderViewDate.setMonth(reminderViewDate.getMonth() + offset);
    renderReminderCalendar();
}

function openTimePicker(targetId) {
    const picker = document.getElementById('reminder-time-picker');
    const display = document.getElementById(targetId); // Đây là chỗ chứa "18:00"
    
    // 1. Ẩn lịch đi
    const calendar = document.getElementById('reminder-calendar');
    if (calendar) calendar.style.display = 'none';

    // 2. Lấy thời gian hiện tại từ nhãn hiển thị (ví dụ "18:00")
    const timeParts = display.innerText.split(':');
    const currentHour = parseInt(timeParts[0]);
    const currentMinute = parseInt(timeParts[1]);

    // 3. Hiện picker lên trước (phải hiện lên thì mới cuộn được)
    picker.classList.add('show');

    // 4. Tìm 2 bánh xe
    const hourWheel = document.getElementById('hour-wheel-reminder');
    const minuteWheel = document.getElementById('minute-wheel-reminder');

    // 5. Dùng setTimeout để đợi trình duyệt render xong cái "show" rồi mới cuộn
    setTimeout(() => {
        if (hourWheel) {
            hourWheel.scrollTop = currentHour * 40;
        }
        if (minuteWheel) {
            minuteWheel.scrollTop = currentMinute * 40;
        }
    }, 10); // 10ms là đủ để nó nhận lệnh
}

function updateReminderTimeDisplay() {
    const h = document.getElementById('hour-wheel-reminder').querySelector('.active')?.innerText || "00";
    const m = document.getElementById('minute-wheel-reminder').querySelector('.active')?.innerText || "00";
    document.getElementById('reminder-time-display').innerText = `${h}:${m}`;
}

function updateReminderEarlyDisplay() {
    const num = document.getElementById('reminder-early-number-wheel').querySelector('.active')?.innerText || "1";
    const unit = document.getElementById('reminder-early-unit-wheel').querySelector('.active')?.innerText || "Phút";
    document.getElementById('reminder-early-display').innerText = `Trước ${num} ${unit.toLowerCase()}`;
}

function toggleReminderEarlyPicker() {
    const container = document.getElementById('reminder-early-picker-container');
    container.classList.toggle('show');
}