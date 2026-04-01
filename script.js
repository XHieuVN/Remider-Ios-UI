// Biến toàn cục để theo dõi tháng/năm đang xem
let currentMonth = new Date().getMonth(); // 0 - 11
let currentYear = new Date().getFullYear();
let currentDay = new Date().getDate();
let allData = [];

// Gọi hàm lần đầu khi load trang
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar(currentMonth, currentYear);
  displayDataPath();
  // Chạy hàm cập nhật trạng thái 2 giây (rất nhẹ)
  setInterval(updateRealtimeStatus, 2000);
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
    console.log("Dữ liệu đã tải:", allData);
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
  // if (!("Notification" in window)) {
  //   console.error("Trình duyệt không hỗ trợ thông báo.");
  //   return;
  // }

  // const options = {
  //   body: message,
  //   // CHIÊU QUYẾT ĐỊNH: Không tự tắt cho đến khi người dùng tương tác
  //   requireInteraction: true,
  //   icon: "./icon.ico",
  //   silent: false, // Đảm bảo có tiếng chuông để gây chú ý
  // };

  // const notification = new Notification(title, options);

  // // Khi người dùng click vào thông báo
  // notification.onclick = function (event) {
  //   event.preventDefault(); // Ngăn chặn xử lý mặc định

  //   // 1. Mở lại cửa sổ App (Nếu đang ẩn)
  //   if (
  //     window.electronAPI &&
  //     typeof window.electronAPI.focusApp === "function"
  //   ) {
  //     window.electronAPI.focusApp();
  //   } else {
  //     window.focus(); // Cách thông thường cho trình duyệt
  //   }

  //   // 2. Tắt thông báo sau khi đã click
  //   notification.close();

  //   console.log("Người dùng đã xem và tắt thông báo.");
  // };
}

const dropZone = document.getElementById('pdfDropZone');
const fileInput = document.getElementById('pdfFileInput');

// 1. Khi click vào drop zone, kích hoạt thẻ input ẩn để mở hộp thoại chọn tệp
dropZone.addEventListener('click', () => {
    fileInput.click();
});

// 2. Ngăn chặn hành vi mặc định của trình duyệt (thường là mở file sang tab mới) khi kéo thả
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
// 4. Xử lý sự kiện khi thả tệp (Drag & Drop)
dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}, false);

// 5. Xử lý sự kiện khi chọn tệp từ máy tính (Click)
fileInput.addEventListener('change', function() {
    handleFiles(this.files);
    // Reset lại giá trị input để có thể chọn lại chính file đó ở lần sau nếu cần
    this.value = null; 
});

// Hàm kiểm tra và chuyển tiếp tệp đi xử lý
function handleFiles(files) {
    if (files.length === 0) return;

    const file = files[0]; // Chỉ lấy file đầu tiên nếu người dùng thả nhiều file

    // Kiểm tra định dạng PDF
    if (file.type !== 'application/pdf') {
        alert('Vui lòng chọn một tệp PDF hợp lệ.');
        return;
    }

    console.log('Đã nhận tệp:', file.name);
    
    // Gửi tệp thẳng vào hàm xử lý
    processPDF(file);
}

const pdfjsLib = window['pdfjs-dist/build/pdf'];
// Cấu hình worker (bắt buộc) bằng link CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Hàm xử lý chính được gọi từ sự kiện Drop hoặc Input file
async function processPDF(file) {
    if (!file) return;

    console.log('Bắt đầu xử lý file:', file.name);

    let imageToRead = null;
    let fileNameExtracted = "";

    try {
        // 1. XỬ LÝ TÊN FILE VÀ ĐỌC NỘI DUNG PDF
        if (file.type === 'application/pdf') {
            // Trích xuất tên từ file
            const nameMatch = file.name.match(/^.*?\([^)]+\)\s*(.*?)(?:\.pdf)$/i);
            if (nameMatch && nameMatch[1]) {
                fileNameExtracted = nameMatch[1].trim();
            } else {
                fileNameExtracted = file.name.replace(/\.pdf$/i, '').trim();
            }

            console.log('Đang chuyển đổi trang PDF thành hình ảnh ngầm...');
            
            // Đọc dữ liệu file
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            // Lấy trang 1
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            
            // TẠO CANVAS ẢO ĐỂ XỬ LÝ (Không hiện lên UI)
            const virtualCanvas = document.createElement('canvas');
            const context = virtualCanvas.getContext('2d');
            virtualCanvas.width = viewport.width;
            virtualCanvas.height = viewport.height;
            
            // Render PDF lên canvas ảo
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            // Trích xuất dữ liệu ảnh từ canvas ảo
            imageToRead = virtualCanvas.toDataURL('image/png');

        } else if (file.type.startsWith('image/')) {
            // Dự phòng trường hợp thả file ảnh
            fileNameExtracted = file.name.replace(/\.(png|jpg|jpeg)$/i, '').trim();
            imageToRead = URL.createObjectURL(file);
        } else {
            console.error('Định dạng tệp không được hỗ trợ. Vui lòng thả file PDF.');
            return;
        }

        // 2. BẮT ĐẦU CHẠY OCR BẰNG TESSERACT
        console.log('Đang chạy nhận diện chữ (OCR)...');
        toggleLoadingState('loading', 'AI đang trích xuất dữ liệu PDF...');
        const { data: { text } } = await Tesseract.recognize(
            imageToRead,
            'vie', 
            // Có thể tắt luôn logger nếu không muốn hiện tiến trình trong console
            { logger: m => console.log(`Tiến trình OCR: ${m.status} - ${Math.round(m.progress * 100)}%`) }
        );
        
        // 3. LỌC DỮ LIỆU TỪ KẾT QUẢ OCR
        const timeRegex = /th[ờòoởi]?i\s*gian\s*:\s*([^\n.]+)/i;
        const locationRegex = /[đd][ịi]a\s*[đd][iỉĩíì]?[ểẻe]m\s*:\s*([^.]+)/i;

        const timeMatch = text.match(timeRegex);
        const locationMatch = text.match(locationRegex);

        const timeStr = timeMatch ? timeMatch[1].trim() : showStatusPanel("Thông báo", "Không tìm thấy dữ liệu thời gian", false); 
        const locationStr = locationMatch ? locationMatch[1].trim() : showStatusPanel("Thông báo", "Không tìm thấy dữ liệu địa điểm",false);

        // 4. KẾT QUẢ CUỐI CÙNG LƯU TRONG BIẾN
        const extractedData = {
            contentName: fileNameExtracted,
            time: timeStr,
            location: locationStr
        };
        toggleLoadingState('loaded', 'Đã lấy dữ liệu thành công! ');
        // Xem kết quả ở Console thay vì hiển thị lên UI
        console.log('--- TRÍCH XUẤT THÀNH CÔNG ---');
        console.log('Dữ liệu lấy được:', extractedData);
        handleExtractedDataToSystem(extractedData); // Hàm này bạn tự định nghĩa để đưa dữ liệu vào hệ thống của bạn (như tạo Reminder mới, v.v.)

    } catch (error) {
        console.error('Có lỗi xảy ra trong quá trình xử lý PDF/OCR:', error);
    }
}

/**
 * Hàm hiển thị màn hình Loading
 * @param {string} state - 'loading' (đang xoay) hoặc 'loaded' (tick xanh thành công)
 * @param {string} message - Dòng chữ hiển thị bên dưới icon
 */
function toggleLoadingState(state, message = "") {
    const overlay = document.getElementById("loadingOverlay");
    const icon = document.getElementById("loadingIcon");
    const text = document.getElementById("loadingText");

    if (!overlay) return;

    if (state === "loading") {
        // 1. Chế độ ĐANG TẢI (Xoay)
        overlay.style.display = "flex";
        
        // Dùng setTimeout để CSS transition opacity có thời gian kích hoạt
        setTimeout(() => {
            overlay.classList.add("active");
        }, 10);
        
        // Gắn icon spinner và hiệu ứng xoay
        icon.className = "fas fa-spinner loading-spinner";
        text.innerText = message || "Đang xử lý...";
        
    } else if (state === "loaded") {
        // 2. Chế độ ĐÃ XONG (Dấu tick xanh)
        // Gắn icon check và gỡ bỏ hiệu ứng xoay
        icon.className = "fas fa-check-circle loading-success";
        text.innerText = message || "Thành công!";

        // Tự động ẩn loading popup sau 1.5 giây
        setTimeout(() => {
            overlay.classList.remove("active"); // Làm mờ đi
            
            // Chờ mờ hẳn (0.3s theo CSS) rồi mới ẩn display
            setTimeout(() => {
                overlay.style.display = "none";
            }, 300);
        }, 1500);
    }
}