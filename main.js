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

// Chuyển đổi "Trước X phút/giờ" thành giây
function convertEarlyToSeconds(earlyStr) {
  if (!earlyStr) return 0;
  const val = parseInt(earlyStr);
  if (isNaN(val)) return 0;
  if (earlyStr.includes("phút") || earlyStr.includes("minute")) return val * 60;
  if (earlyStr.includes("giờ") || earlyStr.includes("hour")) return val * 3600;
  if (earlyStr.includes("ngày") || earlyStr.includes("day")) return val * 86400;
  return 0;
}

// --- LOGIC 1: THÔNG BÁO TỔNG HỢP (Mở máy & Mỗi 4 giờ) ---
function showPeriodicSummary() {
  const now = Math.floor(Date.now() / 1000);
  const overdueItems = cachedReminders.filter(i => i.status === "pending" && i.id < now);

  if (overdueItems.length > 0) {
    // Nếu có trễ hạn: Thông báo tổng số
    new Notification({
      title: "⚠️ Quá Hạn",
      body: `Bạn có ${overdueItems.length} công việc đã QUÁ HẠN, bạn cần chú ý hoàn thành chúng!`,
    }).show();
  } else {
    // Nếu không có trễ hạn: Thông báo deadline gần nhất
    const upcoming = cachedReminders
      .filter(i => i.status === "pending" && i.id >= now)
      .sort((a, b) => a.id - b.id);

    if (upcoming.length > 0) {
      const nearest = upcoming[0];
      new Notification({
        title: "📅 Công việc tiếp theo",
        body: `Công việc sắp tới: ${nearest.title}\nHạn: ${nearest.time} ${nearest.date}`,
      }).show();
    }
  }
}

// --- LOGIC 2: VÒNG LẶP THÔNG BÁO CHI TIẾT (Check mỗi 30s) ---
function startReminderLoop() {
  setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    let hasChanges = false;

    cachedReminders.forEach((item) => {
      if (item.status === "pending" && !item.hasNotified) {
        const earlySec = convertEarlyToSeconds(item.early);
        const notificationTime = item.id - earlySec; // Thời điểm cần báo
        const timeDiff = notificationTime - now;

        // Báo khi đến thời điểm notificationTime (sai số trong khoảng 60s)
        if (timeDiff <= 60 && timeDiff > -60) {
          const isOverdue = item.id < now;
          
          const notifyTitle = isOverdue ? `⚠️ Quá hạn: ${item.title}` : `🔔 Công việc: ${item.title}`;
          const notifyBody = `Hạn: ${item.time} ${item.date}\n${item.note || ""}`;

          new Notification({ title: notifyTitle, body: notifyBody }).show();

          item.hasNotified = true;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      fs.writeFileSync(DATA_PATH, JSON.stringify(cachedReminders, null, 2));
    }
  }, 30000);
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

    // 2. Thiết lập chạy lại thông báo tổng hợp mỗi 4 giờ (4 * 3600 * 1000 ms)
    setInterval(() => showPeriodicSummary(), 4 * 3600 * 1000);

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
  tray = new Tray(path.join(__dirname, "icon.png"));
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
ipcMain.handle("update-data", async (event, updatedItem) => {
    try {
      let data = getDataFromFile();
      data = data.map((item) => item.id === updatedItem.id ? updatedItem : item);
      fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
      refreshCache();
      return true;
    } catch (err) { return false; }
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
    data = data.filter((item) => item.id !== id);
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    refreshCache();
    console.log("Item deleted.");
    return true;
  } catch (err) {
    console.error("Delete error:", err);
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
    
    console.log("Đã lưu vào ổ cứng tại:", dbPath);
});