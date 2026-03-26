// Tạo item cho bánh xe cuộn
function createPickerItem(text, parent) {
  const div = document.createElement("div");
  div.innerText = text;
  if (parent.children.length === 0) {
    const pad = document.createElement("div");
    pad.style.height = "55px";
    parent.appendChild(pad);
  }
  parent.appendChild(div);

  let lastPad = parent.querySelector(".pad-bottom");
  if (lastPad) lastPad.remove();
  const pBot = document.createElement("div");
  pBot.className = "pad-bottom";
  pBot.style.height = "55px";
  parent.appendChild(pBot);
}

// Xử lý cuộn bánh xe
function setupPickerScroll(wheel, callback) {
  wheel.addEventListener("wheel",(e) => {
      e.preventDefault(); // Chặn cuộn mặc định của trình duyệt

      // deltaY > 0 là lăn xuống, < 0 là lăn lên
      // Mỗi lần lăn ta chỉ dịch chuyển 20px (hoặc 40px nếu muốn nhảy đúng 1 item)
      const step = 40;
      const direction = e.deltaY > 0 ? 1 : -1;

      wheel.scrollBy({
        top: direction * step,
        behavior: "smooth", // Tạo hiệu ứng mượt mà
      });
    },
    { passive: false },
  );
  wheel.addEventListener("scroll", () => {
    const index = Math.round(wheel.scrollTop / 40);
    const items = wheel.querySelectorAll("div:not([style])");
    items.forEach((item, i) => {
      if (i === index) {
        item.classList.add("active");
        callback();
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

function convertEarlyToSeconds(earlyText) {
  // Nếu chuỗi rỗng hoặc không có giá trị
  if (!earlyText || earlyText === "Không có") return 0;

  // Tách chuỗi: "Trước 5 phút" -> ["Trước", "5", "phút"]
  const parts = earlyText.split(" ");
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

function handleSave() {
  if (currentTab === "event") {
    saveEventData();
  } else {
    saveReminderData();
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

// lưu dữ liệu ở reminer
async function saveReminderData() {
  // 1. Lấy dữ liệu
  const titleInput = document.querySelector(
    '#reminder-fields input[placeholder="Tiêu đề"]',
  );
  const noteInput = document.querySelector("#reminder-fields textarea");

  const title = titleInput.value;
  const note = noteInput.value;
  const date = document.getElementById("reminder-date-display").innerText;
  const time = document.getElementById("reminder-time-display").innerText;
  const early = document.getElementById("reminder-early-display").innerText;

  if (!title) {
    alert("Vui lòng nhập tiêu đề lời nhắc!");
    return;
  }

  // 2. Tính toán ID theo giây (Dựa trên deadline)
  const parts = date.split("/");
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  // Fix logic năm để không bị "202026"
  const yearRaw = parts[2];
  const year = parseInt(yearRaw.length === 2 ? "20" + yearRaw : yearRaw);

  const timeParts = time.split(":");
  const hour = parseInt(timeParts[0]);
  const minute = parseInt(timeParts[1]);

  const deadlineDate = new Date(year, month - 1, day, hour, minute, 0);
  const idInSeconds = Math.floor(deadlineDate.getTime() / 1000);

  // 3. Tạo Object dữ liệu
  const newReminder = {
    id: idInSeconds,
    title: title,
    note: note,
    date: `${day}/${month}/${year.toString()}`,
    time: time,
    early: early,
    type: "reminder",
    isOverdue: false,
    status: isTaskCompleted ? "completed" : "pending",
  };

  // 4. KIỂM TRA TRÙNG ID VÀ LƯU
  if (window.electronAPI) {
    // Kiểm tra xem ID này đã có trong dữ liệu hiện tại chư

    let result;
    // Nếu không trùng -> Gọi Save để thêm mới
    console.log("ID mới, đang thêm vào danh sách...");
    result = await window.electronAPI.saveData(newReminder);

    // 5. Thông báo và vẽ lại lịch
    if (result) {
      alert(
        `✅"ĐÃ LƯU LỜI NHẮC!\n-------------------\n📌 Tiêu đề: ${title}\n⏰ Deadline: ${time} ${date}`,
      );

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
}

// lưu dữ liệu từ event
function saveEventData() {
  // 1. Lấy giá trị từ các ô Input
  const title = document.getElementById("event-title").value;
  const location = document.getElementById("event-location").value;

  // 2. Lấy giá trị từ các thẻ Span (dữ liệu từ bộ chọn picker)
  const startTime = document.querySelector(
    '.time-box[onclick*="picker-start-time"]',
  ).innerText;
  const startDate = document.querySelector(
    '.date-box[onclick*="picker-start-date"]',
  ).innerText;
  const endTime = document.querySelector(
    '.time-box[onclick*="picker-end-time"]',
  ).innerText;
  const endDate = document.querySelector(
    '.date-box[onclick*="picker-end-date"]',
  ).innerText;
  const travelTime = document.getElementById("travel-time-display").innerText;

  // Kiểm tra nhanh xem đã nhập tiêu đề chưa
  if (!title) {
    alert("Vui lòng nhập tiêu đề sự kiện!");
    return;
  }

  // 3. Tạo cấu trúc dữ liệu Sự kiện
  const newEvent = {
    id: Date.now(), // Tạo ID duy nhất bằng timestamp

    title: title,
    location: location,
    start: `${startDate} ${startTime}`,
    end: `${endDate} ${endTime}`,
    travel: travelTime,
    type: "event",
    isOverdue: false, // Mặc định là false khi mới tạo
    status: "pending", // Trạng thái: 'pending' (đang chờ), 'completed' (đã xong)
  };

  // 4. Lưu vào  file
  if (window.electronAPI) {
    window.electronAPI.saveData(newEvent);
    alert("🔔 Đã lưu Lời nhắc vào file JSON trên máy tính!");
  } else {
    console.error("Cảnh báo: Không tìm thấy Electron API.");
  }

  const message = `
    🎉 ĐÃ LƯU SỰ KIỆN THÀNH CÔNG!
    ------------------------------
    📌 Tiêu đề: ${title}
    📍 Vị trí: ${location}

    🗓️ Bắt đầu: ${startTime} - Ngày ${startDate}
    🗓️ Kết thúc: ${endTime} - Ngày ${endDate}

    🚗 Thời gian di chuyển: ${travelTime}
    ------------------------------
    Dữ liệu này đã sẵn sàng để đưa vào lịch!
    `;

  // 4. Hiển thị alert
  alert(message);

  // (Tùy chọn) Đóng Modal hoặc Reset Form sau khi lưu
  // resetForm();
}

// Hàm xử lý cập nhật (tương tự handleSave nhưng dùng ID cũ)
async function handleUpdate() {
  const activeTab = document.querySelector(".tab.active").innerText;
  let updatedItem = {};

  // 1. LẤY DỮ LIỆU TỪ UI (Giống lúc lưu mới)
  let date, time, title;
  if (activeTab === "Sự kiện") {
    title = document.getElementById("event-title").value;
    date = document.querySelector('.date-box[onclick*="start-date"]').innerText;
    time = document.querySelector('.time-box[onclick*="start-time"]').innerText;

    if (!title) {
      showStatusPanel("Lỗi", "Vui lòng nhập tiêu đề!", false);
      return;
    }

    updatedItem = {
      title: title,
      location: document.getElementById("event-location").value,
      start: `${date} ${time}`,
      end: `${document.querySelector('.date-box[onclick*="end-date"]').innerText} ${document.querySelector('.time-box[onclick*="end-time"]').innerText}`,
      travel: document.getElementById("travel-time-display").innerText,
      type: "event",
    };
  } else {
    const titleInput = document.querySelector("#reminder-fields .ios-input");
    title = titleInput.value;
    date = document.getElementById("reminder-date-display").innerText;
    time = document.getElementById("reminder-time-display").innerText;

    if (!title) {
      showStatusPanel("Lỗi", "Vui lòng nhập tiêu đề!", false);
      return;
    }

    updatedItem = {
      title: title,
      note: document.querySelector("#reminder-fields .ios-textarea").value,
      date: date,
      time: time,
      early: document.getElementById("reminder-early-display").innerText,
      // Thêm trạng thái hoàn thành đã thảo luận trước đó
      completed: isTaskCompleted,
      status: isTaskCompleted ? "completed" : "pending",
      type: "reminder",
    };
  }
  // 2. TÍNH TOÁN ID MỚI DỰA TRÊN THỜI GIAN VỪA SỬA
  const parts = date.split("/");
  const timeParts = time.split(":");
  const d = parseInt(parts[0]),
    m = parseInt(parts[1]);
  const y = parseInt(parts[2].length === 2 ? "20" + parts[2] : parts[2]);
  const hh = parseInt(timeParts[0]),
    mm = parseInt(timeParts[1]);

  // cộng thêm thời gian cảnh báo sớm trước dealine
  const newId =
    Math.floor(new Date(y, m - 1, d, hh, mm, 0).getTime() / 1000) +
    convertEarlyToSeconds(updatedItem.early);
  updatedItem.id = newId;

  // 3. XỬ LÝ GHI ĐÈ TRONG ELECTRON
  if (window.electronAPI) {
    // Trường hợp 1: Người dùng đổi Giờ/Ngày -> ID thay đổi
    if (newId !== editingId) {
      // Xóa cái cũ (vì thời gian đã khác, ID cũ không còn giá trị)
      await window.electronAPI.deleteData(editingId);
      // Lưu cái mới (nếu trùng ID của một task khác có sẵn, nó sẽ ghi đè ở bước updateData)
      await window.electronAPI.saveData(updatedItem);
    }
    // Trường hợp 2: Chỉ sửa nội dung, ID giữ nguyên
    else {
      await window.electronAPI.updateData(updatedItem);
    }

    showStatusPanel("Thành công", "Đã cập nhật thông tin!");
  }

  // 4. DỌN DẸP & CẬP NHẬT GIAO DIỆN
  editingId = null;
  const addBtn = document.querySelector(".btn-add");
  addBtn.innerText = "Thêm";
  addBtn.onclick = handleSave;

  closeModal();

  // Gọi hàm refreshApp để đồng bộ Sidebar và Lịch ngay lập tức
  if (typeof refreshApp === "function") {
    await refreshApp();
  } else {
    renderCalendar(currentMonth, currentYear);
  }
}
