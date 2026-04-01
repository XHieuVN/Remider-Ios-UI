// tạo shortcut
if (require('electron-squirrel-startup')) return;

const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  Notification,
} = require("electron");
const path = require("path");
const fs = require("fs");

if (process.platform === "win32") {
  app.setAppUserModelId("Reminders");
}

let tray = null;
let win = null;
let cachedReminders = [];
const DATA_PATH = path.join(app.getPath("userData"), "calendar-data.json");

// --- HELPER FUNCTIONS ---
function getDataFromFile() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      console.log("Reading data from file:", DATA_PATH);
      const fileContent = fs.readFileSync(DATA_PATH, "utf-8");
      return JSON.parse(fileContent || "[]");
    }
  } catch (err) { console.error("Error reading file:", err); }
  return [];
}

function refreshCache() {
  cachedReminders = getDataFromFile();
  console.log(`Cache reloaded: ${cachedReminders.length} items.`);
}

// --- LOGIC 1: THÔNG BÁO TỔNG HỢP (Mở máy & Mỗi 12 giờ) ---
function showPeriodicSummary() {
  // const now = Math.floor(Date.now() / 1000);
  // const overdueItems = cachedReminders.filter(i => i.status === "pending" && i.timeNum < now);

  // if (overdueItems.length > 0) {
  //   // Nếu có trễ hạn: Thông báo tổng số
  //   new Notification({
  //     title: "Quá Hạn",
  //     body: `Bạn có ${overdueItems.length} công việc đã QUÁ HẠN, bạn cần chú ý hoàn thành chúng!`,
  //   }).show();
  // } else {
  //   // Nếu không có trễ hạn: Thông báo deadline gần nhất
  //   const upcoming = cachedReminders
  //     .filter(i => i.status === "pending" && i.timeNum >= now)
  //     .sort((a, b) => a.timeNum - b.timeNum);

  //   if (upcoming.length > 0) {
  //     const nearest = upcoming[0];
  //     new Notification({
  //       title: "Công việc tiếp theo",
  //       body: `Tên: ${nearest.title}\nHạn: ${nearest.time} ${nearest.date}`,
  //     }).show();
  //   }
  // }
}

// --- LOGIC 2: VÒNG LẶP THÔNG BÁO CHI TIẾT (Check mỗi 30s) ---
function startReminderLoop() {
  // setInterval(() => {
  //   const now = Math.floor(Date.now() / 1000);
  //   console.log(`Checking reminders at ${now}...`);
  //   let hasChanges = false;

  //   cachedReminders.forEach((item) => {
  //     if (item.status === "pending" && !item.hasNotified) {
  //       const earlySec = convertEarlyToSeconds(item.early);
  //       const timeDiff = item.timeNotification - now;
  //       console.log(`item: ${item}`);
  //       console.log(`Checking item: ${item.title} (Notify at: ${item.timeNotification}, Now: ${now}, Diff: ${timeDiff}s)`);
  //       // Báo khi đến thời điểm notificationTime (sai số trong khoảng 60s)
  //       if (timeDiff < 120) {
  //         const deadlineStr = convertTimeToStr(item.timeNum);           // Thời gian Deadline
  //         const scheduledAtStr = convertTimeToStr(item.timeNotification); // Thời gian đúng lịch phải báo
  //         const actualAtStr = convertTimeToStr(now);               // Thời gian thực tế đang báo
  //         const notifyEarlySec = convertTimeToStr(earlySec);        // Thời gian cài đặt báo sớm (chuyển sang định dạng dễ đọc)
  //         const isOverdue = item.timeNotification < now;
  //         const notifyTitle = isOverdue ? `⚠️ Quá hạn: ${item.title}` : `🔔 Công việc: ${item.title}`;
  //         const notifyBody = `Hạn: ${item.time} ${item.date}\n${item.note ? `Chi tiết: ${item.note}` : ""}`;
  //         // const notifyBody = 
  //         //               `📌 Deadline: ${deadlineStr}\n` +
  //         //               `⏰ Cài đặt báo sớm: ${notifyEarlySec || "Không"}\n` +
  //         //               `⏲️ Lịch báo dự kiến: ${scheduledAtStr}\n` +
  //         //               `📡 Thực tế báo lúc: ${actualAtStr}\n` +
  //         //               `⏳ Sai lệch: ${timeDiff} giây\n` +
  //         //               `📝 Ghi chú: ${item.note || "Trống"}`;
  //         new Notification({ title: notifyTitle, body: notifyBody }).show();
  //         console.log(`HasNotification: ${item.title} (Deadline: ${deadlineStr}, Notify at: ${scheduledAtStr}, Actual: ${actualAtStr}, Early: ${notifyEarlySec})`);
  //         item.hasNotified = true;
  //         hasChanges = true;
  //       }
  //     }
  //   });

  //   if (hasChanges) {
  //     fs.writeFileSync(DATA_PATH, JSON.stringify(cachedReminders, null, 2));
  //   }
  // }, 30000);
}


function convertTimeToStr(seconds) {
    const date = new Date(seconds * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const secs = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${secs}`;
}

// Chuyển đổi "Trước X phút/giờ" thành giây
function convertEarlyToSeconds(earlyStr) {
  if (!earlyStr) return 0;
  const lowerStr = earlyStr.toLowerCase();
  const match = lowerStr.match(/\d+/); 
  if (!match) return 0; // Không thấy số nào thì nghỉ

  const val = parseInt(match[0]); // Lấy con số tìm được (ví dụ "10")
  if (isNaN(val)) return 0;
  if (lowerStr.includes("phút") || lowerStr.includes("minute")) return val * 60;
  if (lowerStr.includes("giờ") || lowerStr.includes("hour")) return val * 3600;
  if (lowerStr.includes("ngày") || lowerStr.includes("day")) return val * 86400;
  return 0;
}

// --- KHỞI TẠO APP ---
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
  });

  app.whenReady().then(() => {
    refreshCache();
    createWindow();
    createTray();

    // 1. Chạy thông báo tổng hợp ngay khi mở máy
    setTimeout(() => showPeriodicSummary(), 2000); 

    // 2. Thiết lập chạy lại thông báo tổng hợp mỗi 12 giờ (12 * 3600 * 1000 ms)
    setInterval(() => showPeriodicSummary(), 12 * 3600 * 1000);

    // 3. Chạy vòng lặp thông báo sát giờ
    startReminderLoop();
  });
}

// --- CÁC HÀM CÒN LẠI (GIỮ NGUYÊN) ---
function createWindow() {
  win = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile("index.html");
  win.on("close", (e) => { if (!app.isQuitting) { e.preventDefault(); win.hide(); } });
}

function createTray() {
  tray = new Tray(path.join(__dirname, "icon.ico"));
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show App", click: () => win.show() },
    { type: "separator" },
    { label: "Quit", click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip("iOS Style Reminders");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => { win.isVisible() ? win.hide() : win.show(); });
}

// IPC Handlers... (Giữ nguyên phần ipcMain.handle của ông)
ipcMain.handle("load-from-json", async () => getDataFromFile());
ipcMain.handle('get-path-save-file', async () => {
    return DATA_PATH;
});
ipcMain.handle("update-data", async (event, updatedItem) => {
    try {
        let data = getDataFromFile(); // Giả sử hàm này trả về mảng []
        
        // 1. Dùng ID để tìm và thay thế (ID không đổi khi sửa nội dung)
        const newData = data.map((item) => 
            item.id === updatedItem.id ? updatedItem : item
        );

        // 2. Kiểm tra xem có thực sự tìm thấy để thay đổi không (optional)
        const isExist = data.some(item => item.id === updatedItem.id);
        if (!isExist) {
            console.error("Không tìm thấy item có ID:", updatedItem.id);
            return false; // Hoặc có thể thêm mới nếu muốn
        }

        fs.writeFileSync(DATA_PATH, JSON.stringify(newData, null, 2));
        
        if (typeof refreshCache === "function") refreshCache();
        
        return true;
    } catch (err) { 
        console.error("Error writing file:", err);
        return false; 
    }
});

// --- IPC HANDLERS ---
ipcMain.handle("save-data", async (event, newData) => {
  try {
    const data = getDataFromFile();
    data.push(newData);
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    refreshCache();
    console.log("Data saved successfully.");
    return { success: true };
  } catch (err) {
    console.error("Save error:", err);
    return { success: false };
  }
});


ipcMain.handle("delete-data", async (event, id) => {
  try {
    let data = getDataFromFile();
    const originalLength = data.length;

    // SỬA Ở ĐÂY: So sánh trường item.id và ép kiểu về chuỗi (String) để so sánh chính xác tuyệt đối
    data = data.filter((item) => String(item.id) !== String(id));

    // Kiểm tra xem số lượng phần tử có thực sự giảm đi (tức là đã xóa thành công) hay không
    if (data.length < originalLength) {
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        refreshCache();
        console.log("Deleted item successfully.");
        return true;
    } else {
        console.log("Not found ID.");
        return false; 
    }

  } catch (err) {
    console.error("ERROR when deleting:", err);
    return false;
  }
});

// Đường dẫn file JSON trên ổ cứng
const dbPath = path.join(app.getPath('userData'), 'calendar-data.json');

ipcMain.on('save-to-json', (event, newData) => {
    let data = [];
    
    // 1. Kiểm tra nếu file đã tồn tại thì đọc dữ liệu cũ ra
    if (fs.existsSync(dbPath)) {
        const fileContent = fs.readFileSync(dbPath, 'utf-8');
        data = JSON.parse(fileContent);
    }

    // 2. Thêm dữ liệu mới vào mảng
    data.push(newData);

    // 3. Ghi ngược lại vào file JSON
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log("Saved in storage:", dbPath);
});