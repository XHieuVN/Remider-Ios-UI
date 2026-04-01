// Hàm hiển thị chi tiết
function showDayDetails(day, month, year, reminders) {
    const panel = document.getElementById("detailsPanel");
    const content = document.getElementById("detailsContent");
    const dateTitle = document.getElementById("detailsDateTitle");
    const overlay = document.getElementById("detailsOverlay");

    dateTitle.innerText = `Ngày ${day}/${month + 1}/${year.toString()}`;
    content.innerHTML = ""; 
    overlay.style.display = 'flex'; 
    panel.style.display = 'block';

    if (reminders.length === 0) {
        content.innerHTML = `<p style="color: #888; text-align: center;">Không có lời nhắc nào.</p>`;
    } else {
        const nowInSec = Math.floor(Date.now() / 1000); // Lấy thời gian hiện tại để so sánh

        reminders.forEach(ev => {
            const timeStr = ev.time 
            // --- LOGIC XÁC ĐỊNH MÀU SẮC (Giống hệt bảng lịch) ---
            let statusClass = "";
            if (ev.status === "completed") {
                statusClass = "status-completed";
            } else if (Number(ev.timeNum) < nowInSec) {
                statusClass = "status-overdue";
            } else {
                statusClass = "status-pending";
            }

            const evData = JSON.stringify(ev).replace(/"/g, '&quot;');

            // Thêm class statusClass vào div detail-item
            content.innerHTML += `
                <div class="detail-item ${statusClass}" onclick="prepareEdit('${evData}')">
                    <div class="detail-info">
                        <div class="title">
                            ${ev.title}${ev.note ? ` - Chi tiết: ${ev.note}` : ""}
                        </div>
                        <div class="time">
                            <i class="far fa-clock"></i> ${timeStr}
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    overlay.classList.add("active");
    panel.classList.add("active");
}

function closeDetails() {
  const panel = document.getElementById("detailsPanel");
  const overlay = document.getElementById("detailsOverlay");

  panel.classList.remove("active");
  overlay.classList.remove("active");
  overlay.style.display = "none";
}

let editingId = null; // Biến để biết đang sửa item nào

function prepareEdit(jsonStr) {
    const ev = JSON.parse(jsonStr);
    editingId = ev.id; // Lưu lại ID đang sửa
    console.log("Chuẩn bị sửa:", ev);
    // 1. Đóng bảng chi tiết
    closeDetails();

    // 2. Mở Modal Thêm mới
    openModal();

    // 3. Điền dữ liệu vào các trường (Ví dụ cho Lời nhắc)
    const inputs = document.querySelectorAll('#reminder-fields input, #reminder-fields textarea');
    const completionStatusTxt = document.getElementById("completion-status-text");

    inputs[0].value = ev.title; // Tiêu đề
    inputs[1].value = ev.note || ""; // Ghi chú
    
    document.getElementById('reminder-date-display').innerText = ev.date;
    document.getElementById('reminder-time-display').innerText = ev.time;
    document.getElementById('reminder-early-display').innerText = ev.early;

    if (ev.status === "completed") {
        completionStatusTxt.innerText = "Đã Hoàn Thành";
        completionStatusTxt.className = "status-text completed";
        document.getElementById("status-icon-bg").className = "icon-bg success-green";
    } else {
        completionStatusTxt.innerText = "Chưa Hoàn Thành";
        completionStatusTxt.className = "status-text overdue";
        document.getElementById("status-icon-bg").className = "icon-bg gray";
    }

    const delBtn = document.querySelector('.btn-cancel');
    delBtn.innerText = "Xóa";
    delBtn.style.opacity = "1";
    delBtn.onclick = () => deleteReminderById(ev.id); // Gán hàm xóa với ID cụ thể
    // 4. Đổi tên nút "Thêm" thành "Cập nhật"
    const addBtn = document.querySelector('.btn-add');
    addBtn.innerText = "Cập nhật";
    addBtn.style.opacity = "1";
    // Đổi luôn hàm xử lý khi bấm nút này
    addBtn.onclick = () => handleUpdateReminder(ev);
}

// Hàm hiện thông báo chung (thay cho alert)
function showStatusPanel(title, message, isSuccess = true) {
    const panel = document.getElementById("detailsPanel");
    const overlay = document.getElementById("detailsOverlay");
    const content = document.getElementById("detailsContent");
    const dateTitle = document.getElementById("detailsDateTitle");

    // 1. Định nghĩa bộ màu (Chủ đạo và Nền nhạt)
    const mainColor = isSuccess ? "#007aff" : "#ff3b30"; // Xanh đậm / Đỏ đậm
    const bgColor = isSuccess ? "#e1f5fe" : "#ffebee";   // Xanh nhạt / Đỏ nhạt

    // 2. Gán tiêu đề và màu chữ tiêu đề
    dateTitle.innerText = title;
    dateTitle.style.color = mainColor; 

    overlay.style.display = 'flex'; 
    panel.style.display = 'block';

    // 3. Gán màu vào cái detail-item
    content.innerHTML = `
        <div class="detail-item" style="text-align: center; border-left: none; background-color: ${bgColor} !important; border: 1px solid ${mainColor}44;">
            <div class="title" style="font-size: 28px; margin-bottom: 8px; color: ${mainColor};">
                <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            </div>
            <div class="time" style="justify-content: center; font-size: 16px; color: ${mainColor}; opacity: 1; font-weight: 500;">
                ${message}
            </div>
        </div>
        
        <button onclick="closeDetails()" style="width: 100%; padding: 12px; background: ${mainColor}; color: white; border: none; border-radius: 12px; margin-top: 15px; font-weight: bold; cursor: pointer;">
            Xác nhận
        </button>
    `;

    setTimeout(() => {
        overlay.classList.add("active");
        panel.classList.add("active");
    }, 10);
}