// Biến toàn cục để theo dõi tháng/năm đang xem
let currentMonth = new Date().getMonth(); // 0 - 11
let currentYear = new Date().getFullYear();
let currentDay = new Date().getDate();
let allData = [];

// Gọi hàm lần đầu khi load trang
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar(currentMonth, currentYear);
  displayDataPath();
  // Chạy hàm cập nhật trạng thái mỗi giây (rất nhẹ)
  setInterval(updateRealtimeStatus, 1000);
  ; // Lấy đường dẫn lưu file và hiển thị lên giao diện
});

// Biến lưu danh sách ID đã thông báo để không bị spam

let notifiedIds = new Set();
function updateRealtimeStatus() {
  const nowInSec = Math.floor(Date.now() / 1000);

  // --- CHỈ CẬP NHẬT GIAO DIỆN (Đổi màu đỏ/xanh) ---
  const items = document.querySelectorAll(".calendar-item-row");
  items.forEach((itemRow) => {
    if (itemRow.classList.contains("status-completed")) return;

    const deadlineTs = Number(itemRow.dataset.timeNum); 
    if (deadlineTs < nowInSec) {
      if (!itemRow.classList.contains("status-overdue")) {
        itemRow.classList.remove("status-pending");
        itemRow.classList.add("status-overdue");
      }
    } else {
      if (!itemRow.classList.contains("status-pending")) {
        itemRow.classList.remove("status-overdue");
        itemRow.classList.add("status-pending");
      }
    }
  });

  // --- CẬP NHẬT THỐNG KÊ SIDEBAR ---
  if (typeof updateSidebarStats === "function" && allData.length > 0) {
    updateSidebarStats(allData);
  }
}
// Hàm bất đồng bộ để lấy và hiển thị đường dẫn
async function displayDataPath() {
    try {
        // Gọi API từ preload.js
        const filePath = await window.electronAPI.getPathSaveFile();
        
        // Cập nhật lên giao diện nếu lấy được đường dẫn
        if (filePath) {
            document.getElementById('dataPath').innerText = filePath;
        } else {
            document.getElementById('dataPath').innerText = "Chưa có dữ liệu đường dẫn";
        }
    } catch (error) {
        console.error("Lỗi khi lấy đường dẫn file:", error);
        document.getElementById('dataPath').innerText = "Lỗi tải đường dẫn";
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
    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      cell.classList.add("today");
    }

    cell.innerHTML = `<span>${day}</span>`;

    const dayString = `${day}/${month + 1}/${year}`;
    const dayReminders = allData.filter((item) => {
      return item.date.trim() === dayString;
    });

    cell.onclick = () => showDayDetails(day, month, year, dayReminders);

    if (dayReminders.length > 0) {
      const dotContainer = document.createElement("div");
      dotContainer.className = "dot-container";

      // --- BƯỚC QUAN TRỌNG: Sắp xếp lại mảng ---
      dayReminders.sort((a, b) => {
        const isOverdueA = a.status !== "completed" && Number(a.timeNum) < nowInSec;
        const isOverdueB = b.status !== "completed" && Number(b.timeNum) < nowInSec;

        // Nếu A quá hạn mà B thì không -> đẩy A lên trước (-1)
        if (isOverdueA && !isOverdueB) return -1;
        // Nếu B quá hạn mà A thì không -> đẩy B lên trước (1)
        if (!isOverdueA && isOverdueB) return 1;

        return 0; // Giữ nguyên thứ tự nếu cả 2 cùng trạng thái
      });

      // Sau khi sort, lấy 3 mục đầu tiên (lúc này các mục đỏ đã nằm trên)
      dayReminders.slice(0, 3).forEach((ev) => {
        const itemRow = document.createElement("div");
        itemRow.className = "calendar-item-row";
        itemRow.dataset.timeNum = ev.timeNum;

        // Gán màu (Logic giữ nguyên của bạn)
        let rowStatusClass = "status-pending";
        if (ev.status === "completed") {
          rowStatusClass = "status-completed";
        } else if (Number(ev.timeNum) < nowInSec) {
          rowStatusClass = "status-overdue"; // Màu đỏ
        }

        itemRow.classList.add(rowStatusClass);

        const dot = document.createElement("div");
        dot.className = "dot";

        const titleSpan = document.createElement("span");
        titleSpan.className = "item-title-text";
        titleSpan.innerText =
          ev.type === "event" ? ev.title : `${ev.time} ${ev.title}`;

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
  // 4. DỌN DẸP & reset GIAO DIỆN
  const addBtn = document.querySelector(".btn-add");
  addBtn.innerText = "Thêm";
  addBtn.onclick = saveNewReminder;
  
  const cancelBtn = document.querySelector('.btn-cancel');
  cancelBtn.onclick = closeModal;
  cancelBtn.innerText = "Hủy";
}

// Đóng modal khi click ra ngoài
window.onclick = function (event) {
  if (event.target == document.getElementById("modal")) {
    closeModal();
  }
};

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
  const distToSunday = today.getDay() === 0 ? 0 : 7 - today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (distToSunday === 7 ? 0 : distToSunday));
  sunday.setHours(23, 59, 59, 999); // Hết ngày chủ nhật
  const endOfWeekInSec = Math.floor(sunday.getTime() / 1000);
  // Lặp qua dữ liệu
  list.forEach((item) => {
    if (!item) return;

    // A. Đếm loại
    stats.reminder++;

    // B. Đếm trạng thái Hoàn thành/Chưa làm
    if (item.status === "completed") {
      stats.completed++;
    } else {
      stats.pending++;

      // C. So sánh bằng ID (chỉ tính cho những việc chưa hoàn thành)
      // 1. Kiểm tra trễ hạn
      if (item.timeNum < nowInSec) {
        stats.overdue++;
      } else {
        // 2. Kiểm tra trong 3 ngày tới
        if (item.timeNum <= deadline3Days) {
          stats.next3Days++;
        }

        // 3. Kiểm tra trong tuần này
        if (item.timeNum <= endOfWeekInSec) {
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
    icon: "./icon.ico",
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
