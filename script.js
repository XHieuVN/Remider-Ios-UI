// Biến toàn cục để theo dõi tháng/năm đang xem
let currentMonth = new Date().getMonth(); // 0 - 11
let currentYear = new Date().getFullYear();
let currentDay = new Date().getDate();
let allData = [];

// Gọi hàm lần đầu khi load trang
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar(currentMonth, currentYear);
  // Chạy hàm cập nhật trạng thái mỗi giây (rất nhẹ)
  setInterval(updateRealtimeStatus, 1000);
});

// Biến lưu danh sách ID đã thông báo để không bị spam

let notifiedIds = new Set();
function updateRealtimeStatus() {
    const nowInSec = Math.floor(Date.now() / 1000);
    
    // --- PHẦN 1: CẬP NHẬT GIAO DIỆN (Đỏ khi qua Deadline) ---
    const items = document.querySelectorAll('.calendar-item-row');
    items.forEach(itemRow => {
        if (itemRow.classList.contains('status-completed')) return;

        const deadlineTs = Number(itemRow.dataset.id); // Bây giờ ID là Deadline gốc
        if (deadlineTs < nowInSec) {
            if (!itemRow.classList.contains('status-overdue')) {
                itemRow.classList.remove('status-pending');
                itemRow.classList.add('status-overdue');
            }
        } else {
            if (!itemRow.classList.contains('status-pending')) {
                itemRow.classList.remove('status-overdue');
                itemRow.classList.add('status-pending');
            }
        }
    });

    // --- PHẦN 2: KIỂM TRA THÔNG BÁO (Dựa trên mốc ID trừ đi early) ---
    if (typeof allData !== 'undefined' && allData.length > 0) {
        allData.forEach((item) => {
            if (item.type === "reminder" && item.status !== "completed" && !notifiedIds.has(item.id)) {
                
                // Lấy số giây báo sớm
                const earlySec = typeof convertEarlyToSeconds === 'function' ? convertEarlyToSeconds(item.early) : 0;
                
                // Thời điểm nổ thông báo = Deadline - Báo sớm
                const triggerTime = item.id - earlySec;

                if (nowInSec >= triggerTime) {
                    const title = `🔔 LỜI NHẮC: ${item.title}`;
                    const body = `Hạn chót: ${item.time} ngày ${item.date}\nHãy chuẩn bị thực hiện nhé!`;
                    
                    showNativeNotification(title, body);
                    notifiedIds.add(item.id);
                }
            }
        });
    }

    if (typeof updateSidebarStats === "function" && typeof allData !== 'undefined') {
        updateSidebarStats(allData);
    }
}

async function renderCalendar(month, year) {
    const grid = document.getElementById("calendarGrid");
    const mainTitle = document.getElementById("mainMonthTitle");
    if (mainTitle) mainTitle.innerText = `Tháng ${month + 1}`;

    if (window.electronAPI) {
        allData = await window.electronAPI.loadData();
    }
    
    updateSidebarStats(allData);

    // Xóa lưới cũ
    const headers = grid.querySelectorAll(".day-header");
    grid.innerHTML = "";
    headers.forEach((h) => grid.appendChild(h));

    let firstDay = new Date(year, month, 1).getDay();
    let startDayOffset = firstDay === 0 ? 6 : firstDay - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const nowInSec = Math.floor(Date.now() / 1000); // Tính 1 lần duy nhất ở đây

    for (let i = 0; i < startDayOffset; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "day-cell other-month";
        grid.appendChild(emptyCell);
    }

    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        cell.className = "day-cell";
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add("today");
        }

        cell.innerHTML = `<span>${day}</span>`;
        
        const dayString = `${day}/${month + 1}/${year}`;
        const dayEvents = allData.filter(item => {
            const itemDate = item.type === "event" ? item.start.split(" ")[0] : item.date;
            return itemDate.trim() === dayString;
        });

        cell.onclick = () => showDayDetails(day, month, year, dayEvents);

        if (dayEvents.length > 0) {
          const dotContainer = document.createElement("div");
          dotContainer.className = "dot-container";

          // --- BƯỚC QUAN TRỌNG: Sắp xếp lại mảng ---
          dayEvents.sort((a, b) => {
              const isOverdueA = a.status !== "completed" && Number(a.id) < nowInSec;
              const isOverdueB = b.status !== "completed" && Number(b.id) < nowInSec;

              // Nếu A quá hạn mà B thì không -> đẩy A lên trước (-1)
              if (isOverdueA && !isOverdueB) return -1;
              // Nếu B quá hạn mà A thì không -> đẩy B lên trước (1)
              if (!isOverdueA && isOverdueB) return 1;
              
              return 0; // Giữ nguyên thứ tự nếu cả 2 cùng trạng thái
          });

          // Sau khi sort, lấy 3 mục đầu tiên (lúc này các mục đỏ đã nằm trên)
          dayEvents.slice(0, 3).forEach((ev) => {
              const itemRow = document.createElement("div");
              itemRow.className = "calendar-item-row";
              itemRow.dataset.id = ev.id;

              // Gán màu (Logic giữ nguyên của bạn)
              let rowStatusClass = "status-pending";
              if (ev.status === "completed") {
                  rowStatusClass = "status-completed";
              } else if (Number(ev.id) < nowInSec) {
                  rowStatusClass = "status-overdue"; // Màu đỏ
              }

              itemRow.classList.add(rowStatusClass);

              const dot = document.createElement("div");
              dot.className = "dot";

              const titleSpan = document.createElement("span");
              titleSpan.className = "item-title-text";
              titleSpan.innerText = ev.type === "event" ? ev.title : `${ev.time} ${ev.title}`;

              if (ev.status === "completed") {
                  titleSpan.style.textDecoration = "line-through";
                  titleSpan.style.opacity = "0.5";
              }

              itemRow.append(dot, titleSpan);
              dotContainer.appendChild(itemRow);
          });
          cell.appendChild(dotContainer);
      }
      grid.appendChild(cell);
    }
}

// Logic Modal
function openModal() {
  // reset lại tham số
  resetReminderForm();
  // hiển thị
  document.getElementById("modal").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// Đóng modal khi click ra ngoài
window.onclick = function (event) {
  if (event.target == document.getElementById("modal")) {
    closeModal();
  }
};

/** add deadline mới  */
let currentTab = "reminder";

function switchTab(type, element) {
  // 1. Xử lý UI của nút Tab
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((t) => t.classList.remove("active"));
  element.classList.add("active");

  // 2. Ẩn/Hiện các trường tương ứng
  const eventFields = document.getElementById("event-fields");
  const reminderFields = document.getElementById("reminder-fields");
  currentTab = type;
  if (type === "event") {
    eventFields.style.display = "block";
    reminderFields.style.display = "none";
  } else {
    eventFields.style.display = "none";
    reminderFields.style.display = "block";
  }
}
function changeMonthHome(step) {
  currentMonth += step;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentMonth, currentYear);
}

// logic thông tin chi tiết của ngày

function showRemindersByDay(day, month, year) {
  // 1. Tạo chuỗi ngày khớp với định dạng trong console của bạn: "19/3/26"
  const clickedDate = `${day}/${month + 1}/${year.toString()}`;

  // 3. Lọc dữ liệu
  const dayEvents = allData.filter((item) => {
    if (!item) return false;

    // Lấy đối tượng chứa dữ liệu (đôi khi bị bọc trong một key 'ev' như ảnh console)
    const data = item.ev ? item.ev : item;

    // Kiểm tra ngày: Nếu là 'event' dùng 'start', nếu là 'reminder' dùng 'date'
    const targetDate = data.start ? data.start : data.date;

    return targetDate && targetDate.includes(clickedDate);
  });

  // 4. Hiển thị kết quả
  if (dayEvents.length > 0) {
    let message = `📅 CÁC LỜI NHẮC NGÀY ${clickedDate}:\n\n`;

    dayEvents.forEach((item, index) => {
      const data = item.ev ? item.ev : item; // Xử lý bọc dữ liệu
      const time = data.time
        ? data.time
        : data.start
          ? data.start.split(" ")[1]
          : "--:--";

      message += `${index + 1}. ${data.title}\n`;
      message += `   ⏰ Lúc: ${time}\n`;
      if (data.location) message += `   📍 Vị trí: ${data.location}\n`;
      message += `--------------------------\n`;
    });

    alert(message);
  } else {
    alert(`Ngày ${clickedDate} không có lời nhắc nào.`);
  }
}

//
function updateSidebarStats(data) {
  const list = data || [];

  // 1. Cập nhật tiêu đề tháng
  const title = document.getElementById("sidebarMonthTitle");
  if (title) {
    title.innerText = `Tháng ${currentMonth + 1} ${currentYear}`;
  }

  let stats = {
    event: 0,
    reminder: 0,
    overdue: 0,
    next3Days: 0,
    thisWeek: 0,
    completed: 0, // Trường mới
    pending: 0, // Trường mới
  };

  // Lấy thời gian hiện tại tính bằng giây (Timestamp)
  const nowInSec = Math.floor(Date.now() / 1000);

  // Tính mốc 3 ngày tới (3 ngày * 24 giờ * 3600 giây)
  const threeDaysInSec = 3 * 24 * 60 * 60;
  const deadline3Days = nowInSec + threeDaysInSec;

  // Tính mốc cuối tuần này (đến hết ngày Chủ Nhật)
  const today = new Date();
  const distToSunday = 7 - today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (distToSunday === 7 ? 0 : distToSunday));
  sunday.setHours(23, 59, 59, 999); // Hết ngày chủ nhật
  const endOfWeekInSec = Math.floor(sunday.getTime() / 1000);

  // Lặp qua dữ liệu
  list.forEach((item) => {
    if (!item) return;

    // A. Đếm loại
    if (item.type === "event") stats.event++;
    if (item.type === "reminder") stats.reminder++;

    // B. Đếm trạng thái Hoàn thành/Chưa làm
    if (item.status === "completed") {
      stats.completed++;
    } else {
      stats.pending++;

      // C. So sánh bằng ID (chỉ tính cho những việc chưa hoàn thành)
      // 1. Kiểm tra trễ hạn
      if (item.id < nowInSec) {
        stats.overdue++;
      } else {
        // 2. Kiểm tra trong 3 ngày tới
        if (item.id <= deadline3Days) {
          stats.next3Days++;
        }

        // 3. Kiểm tra trong tuần này
        if (item.id <= endOfWeekInSec) {
          stats.thisWeek++;
        }
      }
    }
  });

  // Cập nhật lên Giao diện (Kiểm tra ID tồn tại để tránh lỗi console)
  const updateText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  //updateText("countEvent", stats.event);
  updateText("countReminder", stats.reminder);
  updateText("countOverdue", stats.overdue);
  updateText("countNext3Days", stats.next3Days);
  updateText("countThisWeek", stats.thisWeek);
  updateText("countCompleted", stats.completed); // Update trường mới
  updateText("countPending", stats.pending); // Update trường mới
}

function showNativeNotification(title, message) {
  // Kiểm tra xem trình duyệt/Electron có hỗ trợ thông báo không
  if (!("Notification" in window)) {
    console.error("Trình duyệt không hỗ trợ thông báo.");
    return;
  }

  const options = {
    body: message,
    // CHIÊU QUYẾT ĐỊNH: Không tự tắt cho đến khi người dùng tương tác
    requireInteraction: true,
    // (Tùy chọn) Có thể thêm icon app của ông ở đây
    // icon: "path/to/icon.png",
    silent: false, // Đảm bảo có tiếng chuông để gây chú ý
  };

  const notification = new Notification(title, options);

  // Khi người dùng click vào thông báo
  notification.onclick = function (event) {
    event.preventDefault(); // Ngăn chặn xử lý mặc định

    // 1. Mở lại cửa sổ App (Nếu đang ẩn)
    if (
      window.electronAPI &&
      typeof window.electronAPI.focusApp === "function"
    ) {
      window.electronAPI.focusApp();
    } else {
      window.focus(); // Cách thông thường cho trình duyệt
    }

    // 2. Tắt thông báo sau khi đã click
    notification.close();

    console.log("Người dùng đã xem và tắt thông báo.");
  };
}
