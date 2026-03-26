// 1. BIẾN TOÀN CỤC CHO SỰ KIỆN
let eventViewDate = new Date(); // Ngày đang xem trên lịch của Sự kiện
let activeEventDateTarget = null; // Lưu ô span nào đang được chọn ngày (bắt đầu hay kết thúc)

// 2. KHỞI TẠO KHI TRANG LOAD
document.addEventListener('DOMContentLoaded', function() {
    initEventWheels();
});

// 3. CÁC HÀM XỬ LÝ CHÍNH
function initEventWheels() {
    // Khởi tạo các bộ chọn giờ/phút cho Sự kiện
    const allTimePickers = document.querySelectorAll('#event-fields .time-picker-container');
    allTimePickers.forEach(picker => {
        const hWheel = picker.querySelector('.hour-wheel');
        const mWheel = picker.querySelector('.minute-wheel');
        if (hWheel && mWheel) {
            // Đổ dữ liệu 00-23 và 00-59
            for(let i=0; i<24; i++) createPickerItem(i.toString().padStart(2, '0'), hWheel);
            for(let i=0; i<60; i++) createPickerItem(i.toString().padStart(2, '0'), mWheel);
            // Lắng nghe sự kiện cuộn
            setupPickerScroll(hWheel, () => updateEventTimeLabel(picker));
            setupPickerScroll(mWheel, () => updateEventTimeLabel(picker));
        }
    });

    // Khởi tạo riêng cho Thời gian di chuyển
    const tNum = document.getElementById('travel-number-wheel');
    const tUnit = document.getElementById('travel-unit-wheel');
    if (tNum && tUnit) {
        for(let i=0; i<=60; i+=5) createPickerItem(i, tNum);
        ["Phút", "Giờ"].forEach(u => createPickerItem(u, tUnit));
        setupPickerScroll(tNum, updateTravelDisplay);
        setupPickerScroll(tUnit, updateTravelDisplay);
    }

    // khởi tạo lời nhắc sớm
    const eNum = document.getElementById('event-early-number-wheel');
    const eUnit = document.getElementById('event-early-unit-wheel');

    if (eNum && eUnit) {
        // Đổ số từ 1 đến 30
        for(let i=1; i<=30; i++) createPickerItem(i, eNum);
        
        // Đổ đơn vị thời gian
        ["Phút", "Giờ", "Ngày", "Tuần"].forEach(u => createPickerItem(u, eUnit));

        // Thiết lập sự kiện cuộn
        setupPickerScroll(eNum, updateEventEarlyDisplay);
        setupPickerScroll(eUnit, updateEventEarlyDisplay);
    }
}

function updateEventEarlyDisplay() {
    const numWheel = document.getElementById('event-early-number-wheel');
    const unitWheel = document.getElementById('event-early-unit-wheel');
    
    const num = numWheel.querySelector('.active')?.innerText || "1";
    const unit = unitWheel.querySelector('.active')?.innerText || "Phút";
    
    const display = document.getElementById('early-event-display');
    if (display) {
        display.innerText = `Trước ${num} ${unit.toLowerCase()}`;
    }
}

// Bật/Tắt các bộ chọn (Lịch hoặc Giờ) trong Sự kiện
function toggleLocalPicker(id) {
    const el = document.getElementById(id);
    const isShowing = (el.style.display === 'block' || el.classList.contains('show'));

    // Đóng tất cả các picker khác trong vùng Sự kiện để tránh chồng nhau
    document.querySelectorAll('#event-fields .local-picker, #event-fields .time-picker-container').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('show');
    });

    if (!isShowing) {
        if (el.classList.contains('time-picker-container')) {
            el.style.display = 'flex';
            el.classList.add('show');
        } else {
            el.style.display = 'block';
            // Nếu là lịch, thì vẽ lịch luôn
            if (id.includes('date')) {
                activeEventDateTarget = document.querySelector(`.date-box[onclick*="${id}"]`);
                renderEventCalendar(el);
            }
        }
    }
}

// Vẽ lịch riêng cho Sự kiện
function renderEventCalendar(pickerEl) {
    const container = pickerEl.querySelector('.calendar-grid');
    const label = pickerEl.querySelector('.month-year-label');
    
    // Gọi hàm vẽ lịch dùng chung (viết ở dưới cùng)
    renderUniversalCalendar(container, label, eventViewDate, (day, month, year) => {
        if (activeEventDateTarget) {
            activeEventDateTarget.innerText = `${day}/${month + 1}/${year.toString().slice(-2)}`;
            pickerEl.style.display = 'none'; // Chọn xong thì đóng
        }
    });
}

// Chuyển tháng cho lịch Sự kiện
function changeMonthLocal(btn, offset) {
    eventViewDate.setMonth(eventViewDate.getMonth() + offset);
    const pickerEl = btn.closest('.calendar-wrapper');
    renderEventCalendar(pickerEl);
}

// Cập nhật nhãn giờ khi cuộn
function updateEventTimeLabel(picker) {
    const h = picker.querySelector('.hour-wheel .active')?.innerText || "00";
    const m = picker.querySelector('.minute-wheel .active')?.innerText || "00";
    // Tìm ô span tương ứng để hiển thị
    const display = document.querySelector(`.time-box[onclick*="${picker.id}"]`);
    if (display) display.innerText = `${h}:${m}`;
}

// Bật/tắt riêng cho Travel Picker
function toggleTravelPicker() {
    const container = document.getElementById('travel-picker-container');
    const chevron = document.getElementById('travel-chevron');
    const isOpening = !container.classList.contains('show');
    if(container.style.display == 'none') container.style.display = 'block'
    container.classList.toggle('show');
    chevron.className = isOpening ? "fas fa-chevron-up selector-icon" : "fas fa-chevron-down selector-icon";
}

function updateTravelDisplay() {
    const num = document.getElementById('travel-number-wheel').querySelector('.active')?.innerText || "0";
    const unit = document.getElementById('travel-unit-wheel').querySelector('.active')?.innerText || "Phút";
    const display = document.getElementById('travel-time-display');
    if(display) display.innerText = (num === "0") ? "Không có" : `${num} ${unit.toLowerCase()}`;
}