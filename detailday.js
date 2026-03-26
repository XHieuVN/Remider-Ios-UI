// Hàm hiển thị chi tiết
function showDayDetails(day, month, year, events) {
    const panel = document.getElementById("detailsPanel");
    const content = document.getElementById("detailsContent");
    const dateTitle = document.getElementById("detailsDateTitle");
    const overlay = document.getElementById("detailsOverlay");

    dateTitle.innerText = `Ngày ${day}/${month + 1}/${year.toString()}`;
    content.innerHTML = ""; 
    overlay.style.display = 'flex'; 
    panel.style.display = 'block';

    if (events.length === 0) {
        content.innerHTML = `<p style="color: #888; text-align: center;">Không có sự kiện nào.</p>`;
    } else {
        const nowInSec = Math.floor(Date.now() / 1000); // Lấy thời gian hiện tại để so sánh

        events.forEach(ev => {
            const timeStr = ev.type === 'event' 
                ? `${ev.start.split(' ')[1]} - ${ev.end.split(' ')[1]}` 
                : ev.time;

            // --- LOGIC XÁC ĐỊNH MÀU SẮC (Giống hệt bảng lịch) ---
            let statusClass = "";
            if (ev.status === "completed") {
                statusClass = "status-completed";
            } else if (Number(ev.id) < nowInSec) {
                statusClass = "status-overdue";
            } else {
                statusClass = "status-pending";
            }

            const evData = JSON.stringify(ev).replace(/"/g, '&quot;');

            // Thêm class statusClass vào div detail-item
            content.innerHTML += `
                <div class="detail-item ${statusClass}" onclick="prepareEdit('${evData}')">
                    <div class="detail-info">
                        <div class="title">${ev.title}</div>
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

    // 1. Đóng bảng chi tiết
    closeDetails();

    // 2. Mở Modal Thêm mới
    openModal();

    // 3. Điền dữ liệu vào các trường (Ví dụ cho Lời nhắc)
    if (ev.type === 'reminder') {
        switchTab('reminder', document.querySelector('.tab[onclick*="reminder"]'));
        
        const inputs = document.querySelectorAll('#reminder-fields input, #reminder-fields textarea');
        inputs[0].value = ev.title; // Tiêu đề
        inputs[1].value = ev.note || ""; // Ghi chú
        
        document.getElementById('reminder-date-display').innerText = ev.date;
        document.getElementById('reminder-time-display').innerText = ev.time;
        document.getElementById('reminder-early-display').innerText = ev.early;
    }

    // 4. Đổi tên nút "Thêm" thành "Cập nhật"
    const addBtn = document.querySelector('.btn-add');
    addBtn.innerText = "Cập nhật";
    addBtn.style.opacity = "1";
    // Đổi luôn hàm xử lý khi bấm nút này
    addBtn.onclick = handleUpdate;
}

// Hàm hiện thông báo chung (thay cho alert)
function showStatusPanel(title, message, isSuccess = true) {
    const panel = document.getElementById("detailsPanel");
    const overlay = document.getElementById("detailsOverlay");
    const content = document.getElementById("detailsContent");
    const dateTitle = document.getElementById("detailsDateTitle");

    // 1. Thay tiêu đề (Ví dụ: "Thông báo" hoặc "Thành công")
    dateTitle.innerText = title;
    dateTitle.style.color = isSuccess ? "#3fa8e5" : "#ff3b30"; // Xanh nếu thành công, đỏ nếu lỗi
    overlay.style.display = 'flex'; 
    
    // Đảm bảo panel cũng hiện ra
    panel.style.display = 'block';
    // 2. Thay nội dung HTML (Dùng style xanh đen ông thích)
    content.innerHTML = `
        <div class="detail-item" style="text-align: center; border-left: none;">
            <div class="title" style="font-size: 22px; margin-bottom: 10px;">
                <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            </div>
            <div class="time" style="justify-content: center; font-size: 16px; opacity: 1;">
                ${message}
            </div>
        </div>
        <button onclick="closeDetails()" style="width: 100%; padding: 12px; background: #3fa8e5; color: white; border: none; border-radius: 8px; margin-top: 15px; font-weight: bold; cursor: pointer;">
            Xác nhận
        </button>
    `;
    setTimeout(() => {
        overlay.classList.add("active");
        panel.classList.add("active");
    }, 10);
}