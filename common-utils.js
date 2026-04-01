// Tạo item cho bánh xe cuộn
const ITEM_HEIGHT = 40; // Chiều cao mỗi item

// Hàm tạo item cho bánh xe
function createPickerItem(text, parent) {
    const div = document.createElement("div");
    div.className = "picker-item";
    div.innerText = text;
    parent.appendChild(div);
}

function initWheel(wheelId, range, repeat = 3) {
  const wheel = document.getElementById(wheelId);
  wheel.innerHTML = ''; // Xóa cũ

  // Tạo các item lặp lại (ví dụ 3 lần: 0-59, 0-59, 0-59)
  for (let r = 0; r < repeat; r++) {
    for (let i = 0; i <= range; i++) {
      const div = document.createElement("div");
      div.className = "picker-item";
      // Định dạng số có 2 chữ số (08, 09...)
      div.innerText = i < 10 ? `0${i}` : i; 
      wheel.appendChild(div);
    }
  }
}
function scrollToValue(wheel, value) {
    if (!wheel) return;
    const items = Array.from(wheel.querySelectorAll('.picker-item'));
    
    // Tìm các vị trí chứa giá trị cần chọn
    const matches = items.reduce((acc, item, index) => {
        if (item.innerText.toString().toLowerCase() === value.toString().toLowerCase()) acc.push(index);
        return acc;
    }, []);

    if (matches.length > 0) {
        // Chọn nhóm ở giữa (vòng 2)
        const targetIndex = matches[Math.floor(matches.length / 2)];
        
        // CÔNG THỨC CHUẨN: 
        // Vị trí cuộn = (Vị trí thẻ * 40px) - (Khung 150px / 2) + (Thẻ 40px / 2)
        // Rút gọn: (targetIndex * 40) - 75 + 20 = (targetIndex * 40) - 55
        const scrollPos = (targetIndex * ITEM_HEIGHT) - 55;
        
        wheel.style.scrollSnapType = 'none';
        wheel.scrollTo({
            top: scrollPos,
            behavior: 'auto' // Nhảy lập tức
        });

        setTimeout(() => {
            wheel.style.scrollSnapType = 'y mandatory';
        }, 50);
    }
}

function setupPickerScroll(wheel, callback) {
    wheel.addEventListener("wheel", (e) => {
        e.preventDefault();
        const direction = e.deltaY > 0 ? 1 : -1;
        wheel.scrollBy({
            top: direction * ITEM_HEIGHT,
            behavior: "smooth"
        });
    }, { passive: false });

    wheel.addEventListener("scroll", () => {
        const items = wheel.querySelectorAll(".picker-item");
        if (items.length === 0) return;
        
        const singleLoopHeight = (items.length / 3) * ITEM_HEIGHT;

        // Cuộn vô cực
        if (wheel.scrollTop < ITEM_HEIGHT) {
            wheel.scrollTop += singleLoopHeight;
        } else if (wheel.scrollTop > wheel.scrollHeight - wheel.clientHeight - ITEM_HEIGHT) {
            wheel.scrollTop -= singleLoopHeight;
        }

        // SỬA LỖI LỆCH 1 ĐƠN VỊ TẠI ĐÂY:
        // Tâm của bánh xe = scrollTop + nửa chiều cao khung (150 / 2 = 75px)
        const centerPos = wheel.scrollTop + 75; 
        
        // Lấy tâm bánh xe chia cho 40px sẽ ra CHÍNH XÁC thẻ nào đang ở giữa
        const index = Math.floor(centerPos / ITEM_HEIGHT);
        
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add("active");
                if(callback) callback(); 
            } else {
                item.classList.remove("active");
            }
        });
    });
}

// Hàm vẽ lịch "vạn năng"
function renderUniversalCalendar(container, labelEl, viewDate, onSelect) {
  container.innerHTML = "";
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  labelEl.innerText = `Tháng ${month + 1} năm ${year}`;

  const startDay = new Date(year, month, 1).getDay();
  const offset = startDay === 0 ? 6 : startDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < offset; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day other-month";
    container.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";
    dayDiv.innerText = day;
    const today = new Date();
    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayDiv.classList.add("today");
    }
    dayDiv.onclick = () => onSelect(day, month, year);
    container.appendChild(dayDiv);
  }
}

// reset lại app
async function refreshApp() {
  if (window.electronAPI) {
    // 1. Phải đợi load xong data đã
    const newData = await window.electronAPI.loadData();

    // 2. Gán vào biến toàn cục để các hàm khác dùng chung
    allData = newData || [];

    // 3. Vẽ lại lịch
    renderCalendar(currentMonth, currentYear);

    // 4. Cập nhật Sidebar (Truyền đúng dữ liệu vừa load)
    updateSidebarStats(allData);
  }
}


// logic calc time and number
function calcTimeNotification(dateStr, timeStr, earlyStr) {
  // cộng thêm thời gian cảnh báo sớm trước dealine
  return (TimeTxtToNum(dateStr, timeStr) - convertEarlyToSeconds(earlyStr));
}

function TimeTxtToNum(dateStr, timeStr) {
  // 2. Tính toán ID theo giây (Dựa trên deadline)
  const parts = dateStr.split("/");
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  // Fix logic năm để không bị "202026"
  const yearRaw = parts[2];
  const year = parseInt(yearRaw.length === 2 ? "20" + yearRaw : yearRaw);

  const timeParts = timeStr.split(":");
  const hour = parseInt(timeParts[0]);
  const minute = parseInt(timeParts[1]);

  const deadlineDate = new Date(year, month - 1, day, hour, minute, 0);
  return Math.floor(deadlineDate.getTime() / 1000);

}

function convertEarlyToSeconds(earlyTxt) {
  // Nếu chuỗi rỗng hoặc không có giá trị
  if (!earlyTxt || earlyTxt === "Không có") return 0;

  // Tách chuỗi: "Trước 5 phút" -> ["Trước", "5", "phút"]
  const parts = earlyTxt.split(" ");
  const value = parseInt(parts[1]); // Lấy con số: 5
  const unit = parts[2].toLowerCase(); // Lấy đơn vị: phút

  let seconds = 0;
  switch (unit) {
    case "phút":
      seconds = value * 60;
      break;
    case "giờ":
      seconds = value * 3600;
      break;
    case "ngày":
      seconds = value * 86400;
      break;
    case "tuần":
      seconds = value * 604800;
      break;
    default:
      seconds = 0;
  }
  return seconds;
}

async function handleExtractedDataToSystem(extractedData) {
    const rawTimeStr = extractedData.time; // "Ngày 01/4/2026 (thứ Tư); sáng từ 08h00, chiều từ 14h00"
    
    // 1. Tách ngày và định dạng lại thành DD/MM/YYYY
    const dateMatch = rawTimeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) {
        console.error("Không tìm thấy định dạng ngày phù hợp.");
        return;
    }
    // Thay đổi ở dòng này: Đưa [1] (Ngày) lên trước, [2] (Tháng) ở giữa, [3] (Năm) ở cuối
    const dateStr = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;

    // 2. Tách tất cả các khung giờ (Tìm tất cả các dạng HHhMM)
    const timeMatches = Array.from(rawTimeStr.matchAll(/(\d{1,2})h(\d{2})/g));
    const timeSlots = timeMatches.map(m => `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`);

    // console.log("Các khung giờ đã trích xuất:", timeSlots);
    // console.log("Ngày đã trích xuất:", dateStr);

    if (timeSlots.length === 0) {
        console.error("Không tìm thấy khung giờ.");
        return;
    }
    
    
    // 3. Lặp qua từng khung giờ để tạo và lưu Reminder
    for (const timeStr of timeSlots) {
        const title = extractedData.contentName;
        const note = "";
        const earlyStr = "Trước 15 phút"; // Có thể mặc định báo trước 15 phút

        const newReminder = {
            id: Date.now(), // Thêm số ngẫu nhiên để tránh trùng ID khi tạo nhanh trong loop
            title: title + " - Địa điểm: " + extractedData.location, // Thêm thời gian vào tiêu đề để dễ phân biệt
            note: note,
            date: dateStr, // Lúc này dateStr sẽ là "1/4/2026"
            time: timeStr,
            timeNum: typeof TimeTxtToNum === "function" ? TimeTxtToNum(dateStr, timeStr) : 0,
            early: earlyStr,
            timeNotification: typeof calcTimeNotification === "function" ? calcTimeNotification(dateStr, timeStr, earlyStr) : "",
            isOverdue: false,
            status: "pending", // Mặc định là chờ xử lý
            hasNotified: false,
        };

        console.log("Đang xử lý lời nhắc:", newReminder);

        // Gọi logic lưu vào Electron
        if (window.electronAPI) {
            const result = await window.electronAPI.saveData(newReminder);
            if (result) {
                console.log(`Lưu thành công khung giờ ${timeStr}`);
            }
        }
    }

    // Sau khi chạy xong vòng lặp thì cập nhật UI một lần
    if (typeof refreshApp === "function") {
        await refreshApp();
    } else if (typeof renderCalendar === "function") {
        renderCalendar(currentMonth, currentYear);
    }
    
    if (typeof showStatusPanel === "function") {
        showStatusPanel("Thông báo", `Đã tự động thêm ${timeSlots.length} lời nhắc từ file! \n Tên văn bản: ${newReminder.title} \n Thời gian: ${newReminder.time} \n Địa điểm: ${newReminder.location} `, true);
    }
}

// lưu dữ liệu ở reminer
async function saveNewReminder() {
  // 1. Lấy dữ liệu
  const title = document.querySelector('#reminder-fields input[placeholder="Tiêu đề"]').value;
  const note = document.querySelector("#reminder-fields textarea").value;
  const dateStr = document.getElementById("reminder-date-display").innerText;
  const timeStr = document.getElementById("reminder-time-display").innerText;
  const earlyStr = document.getElementById("reminder-early-display").innerText;

  if (!title) {
    showStatusPanel("Thiếu thông tin", "Vui lòng nhập tiêu đề lời nhắc!", false);
    return;
  }

  // 3. Tạo Object dữ liệu
  const newReminder = {
    id: Date.now(),
    title: title,
    note: note,
    date: dateStr,
    time: timeStr,
    timeNum: TimeTxtToNum(dateStr, timeStr),
    early: earlyStr,
    timeNotification: calcTimeNotification(dateStr, timeStr, earlyStr),
    isOverdue: false,
    status: document.getElementById("completion-status-text").classList.contains("completed") ? "completed" : "pending",
    hasNotified: false, // Trường mới để đánh dấu đã thông báo lần nào chưa
  };
  console.log("Dữ liệu mới tạo:", newReminder);
  if (window.electronAPI) {
    let result;
    // Nếu không trùng -> Gọi Save để thêm mới
    console.log("Đang thêm vào danh sách...");
    result = await window.electronAPI.saveData(newReminder);

    // 5. Thông báo và vẽ lại lịch
    if (result) {
      showStatusPanel("Thông báo", "LƯU LỜI NHẮC THÀNH CÔNG!", true);
      // Cập nhật lại toàn bộ UI (hàm refreshApp tui đã chỉ ở câu trước)
      if (typeof refreshApp === "function") {
        await refreshApp();
      } else {
        renderCalendar(currentMonth, currentYear);
      }
    }
  } else {
    console.error("Lỗi: Không tìm thấy Electron API.");
  }
  closeModal();
}

// Hàm xử lý cập nhật 
async function handleUpdateReminder(ev) {

    // 2. TÍNH TOÁN timeNotification MỚI DỰA TRÊN THỜI GIAN VỪA SỬA
    ev.title = document.querySelector("#reminder-fields .ios-input").value;
    ev.note = document.querySelector("#reminder-fields .ios-textarea").value;
    ev.date = document.getElementById("reminder-date-display").innerText;
    ev.time = document.getElementById("reminder-time-display").innerText;
    ev.timeNum = TimeTxtToNum(ev.date, ev.time);
    ev.early = document.getElementById("reminder-early-display").innerText;
    ev.timeNotification = calcTimeNotification(ev.date, ev.time, ev.early);
    ev.isOverdue = false; // Reset lại trạng thái quá hạn, để hàm vòng lặp sẽ tự kiểm tra và cập nhật sau
    ev.status = document.getElementById("completion-status-text").classList.contains("completed") ? "completed" : "pending";
    ev.hasNotified = false; // Reset lại trạng thái đã thông báo, để vòng lặp sẽ tự kiểm tra và cập nhật sau
    if (!ev.title) {
      showStatusPanel("Lỗi", "Vui lòng nhập tiêu đề!", false);
      return;
    }
  // 3. Lưu data
  if (window.electronAPI) {
    const result = await window.electronAPI.updateData(ev);
    if (result) {
      console.log("Đổi thành dữ liệu mới:", ev);
      showStatusPanel("Thành công", "Đã cập nhật thông tin!",true);
    }else {
      console.error("Lỗi cập nhật dữ liệu.");
      showStatusPanel("Lỗi", "Cập nhật thất bại!", false);
      return;
    }
  }

  // 4. DỌN DẸP & reset GIAO DIỆN
  closeModal();

  // Gọi hàm refreshApp để đồng bộ Sidebar và Lịch ngay lập tức
  if (typeof refreshApp === "function") {
    await refreshApp();
  } else {
    renderCalendar(currentMonth, currentYear);
  }
}
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

// chưa làm / đã làm 
function toggleCompletionStatus() {
    isTaskCompleted = !isTaskCompleted;
    const completionStatusTxt = document.getElementById("completion-status-text");
    const iconBg = document.getElementById("status-icon-bg");

    if (isTaskCompleted) {
        completionStatusTxt.innerText = "[V] đã làm";
        completionStatusTxt.className = "status-text completed";
        iconBg.className = "icon-bg success-green";
    } else {
        completionStatusTxt.innerText = "[X] chưa làm";
        completionStatusTxt.className = "status-text overdue";
        iconBg.className = "icon-bg gray";
    }
}

// Hàm khởi tạo toàn bộ bánh xe
function initReminderWheels() {
    const rHour = document.getElementById('hour-wheel-reminder');
    const rMin = document.getElementById('minute-wheel-reminder');
    const eNum = document.getElementById('reminder-early-number-wheel');
    const eUnit = document.getElementById('reminder-early-unit-wheel');

    // 1. Khởi tạo Giờ/Phút (Lặp 3 vòng)
    if (rHour && rMin) {
        for (let r = 0; r < 3; r++) {
            for (let i = 0; i < 24; i++) createPickerItem(i.toString().padStart(2, '0'), rHour);
            for (let i = 0; i < 60; i++) createPickerItem(i.toString().padStart(2, '0'), rMin);
        }
        setupPickerScroll(rHour, updateReminderTimeDisplay);
        setupPickerScroll(rMin, updateReminderTimeDisplay);
    }

    // 2. Khởi tạo Lời nhắc sớm (Lặp 3 vòng)
    if (eNum && eUnit) {
        for (let r = 0; r < 3; r++) {
            for (let i = 1; i <= 30; i++) createPickerItem(i, eNum);
            ["Phút", "Giờ", "Ngày", "Tuần"].forEach(u => createPickerItem(u, eUnit));
        }
        setupPickerScroll(eNum, updateReminderEarlyDisplay);
        setupPickerScroll(eUnit, updateReminderEarlyDisplay);
    }
}

//
function openTimePicker(displayId) {
    const picker = document.getElementById('reminder-time-picker');
    const isOpening = !picker.classList.contains('show');

    if (isOpening) {
        // Nếu đang đóng -> Mở ra và nhảy số ngay lập tức
        const currentTime = document.getElementById(displayId).innerText; 
        const [h, m] = currentTime.split(':');
        
        picker.classList.add('show'); 

        // GỌI NGAY LẬP TỨC (Không dùng setTimeout chờ đợi nữa)
        scrollToValue(document.getElementById('hour-wheel-reminder'), h);
        scrollToValue(document.getElementById('minute-wheel-reminder'), m);
    } else {
        // Nếu đang mở -> Đóng lại
        picker.classList.remove('show');
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

function updateReminderTimeDisplay() {
    const h = document.getElementById('hour-wheel-reminder').querySelector('.active')?.innerText || "00";
    const m = document.getElementById('minute-wheel-reminder').querySelector('.active')?.innerText || "00";
    document.getElementById('reminder-time-display').innerText = `${h}:${m}`;
}
// Hàm xử lý xóa lời nhắc theo ID
async function deleteReminderById(id) {
    if (!id) return;

    // Hiển thị cảnh báo xác nhận trước khi xóa
    const isConfirm = confirm("Bạn có chắc chắn muốn xóa lời nhắc này không?");
    if (!isConfirm) return;

    if (window.electronAPI) {
        try {
            // Gọi API xóa từ preload.js
            const result = await window.electronAPI.deleteData(id);
            
            if (result) {
                console.log("Đã xóa lời nhắc có ID:", id);
                showStatusPanel("Thành công", "Đã xóa lời nhắc thành công!", true);
                
                // Đóng Modal chi tiết/chỉnh sửa (nếu đang mở)
                if (typeof closeModal === "function") {
                    closeModal();
                }

                // Cập nhật lại Sidebar và Lịch ngay lập tức
                if (typeof refreshApp === "function") {
                    await refreshApp();
                } else {
                    renderCalendar(currentMonth, currentYear);
                }
            } else {
                console.error("Lỗi không xóa được dữ liệu.");
                showStatusPanel("Lỗi", "Không tìm thấy hoặc không thể xóa lời nhắc này!", false);
            }
        } catch (error) {
            console.error("Lỗi khi chạy chức năng xóa:", error);
            showStatusPanel("Lỗi", "Đã xảy ra lỗi hệ thống khi xóa!", false);
        }
    } else {
        console.error("Lỗi: Không tìm thấy Electron API.");
    }
}

function updateReminderEarlyDisplay() {
    const num = document.getElementById('reminder-early-number-wheel').querySelector('.active')?.innerText || "1";
    const unit = document.getElementById('reminder-early-unit-wheel').querySelector('.active')?.innerText || "Phút";
    document.getElementById('reminder-early-display').innerText = `Trước ${num} ${unit.toLowerCase()}`;
}

// Mở bộ chọn nhắc sớm và cuộn đến giá trị hiện tại
function toggleReminderEarlyPicker() {
    const container = document.getElementById('reminder-early-picker-container');
    const chevron = document.getElementById('reminder-early-chevron');
    
    container.classList.toggle('show');
    if(chevron) chevron.classList.toggle('fa-chevron-up'); 

    if (container.classList.contains('show')) {
        const currentText = document.getElementById('reminder-early-display').innerText; 
        const parts = currentText.replace('Trước ', '').split(' ');
        const num = parts[0];
        const unit = parts[1];

        // TĂNG THỜI GIAN CHỜ tương tự ở đây
        setTimeout(() => {
            scrollToValue(document.getElementById('reminder-early-number-wheel'), num);
            scrollToValue(document.getElementById('reminder-early-unit-wheel'), unit);
        }, 350);
    }
}