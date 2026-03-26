const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron'); // Thêm Tray, Menu
// ... các biến khác giữ nguyên ...

let tray = null;
let win = null;
const path = require('path');
const fs = require('fs');

// Đường dẫn file lưu trữ: AppData/Roaming/[Tên App]/calendar-data.json
const DATA_PATH = path.join(app.getPath('userData'), 'calendar-data.json');

function createWindow() {
    win = new BrowserWindow({
        width: 1200, height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile('index.html');

    // CHIÊU CHẠY NGẦM: Khi bấm nút đóng, chỉ ẩn cửa sổ chứ không thoát
    win.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            win.hide();
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    // TẠO ICON DƯỚI KHAY HỆ THỐNG (TRAY)
    // Ông cần 1 file icon.png nhỏ trong thư mục dự án nhé
    tray = new Tray(path.join(__dirname, 'icon.png')); 
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Hiện App', click: () => win.show() },
        { label: 'Thoát hẳn', click: () => {
            app.isQuitting = true;
            app.quit();
        }}
    ]);
    tray.setToolTip('Lịch Nhắc Việc iOS');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => win.show());
});



function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile('index.html');
    // win.webContents.openDevTools(); // Mở để debug khi cần
}

// Hàm hỗ trợ đọc dữ liệu an toàn
function getDataFromFile() {
    try {
        if (fs.existsSync(DATA_PATH)) {
            const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
            return JSON.parse(fileContent || "[]");
        }
    } catch (err) {
        console.error("Lỗi đọc file:", err);
    }
    return [];
}

// 1. Lắng nghe lệnh LƯU MỚI (Dùng handle để trả về kết quả cho UI)
ipcMain.handle('save-data', async (event, newData) => {
    try {
        const data = getDataFromFile();
        data.push(newData);
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        console.log("✅ Đã lưu mới vào:", DATA_PATH);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// 2. Lắng nghe lệnh LOAD dữ liệu
ipcMain.handle('load-from-json', async () => {
    return getDataFromFile();
});

// 3. Lắng nghe lệnh CẬP NHẬT (Sửa đè dựa trên ID)
ipcMain.handle('update-data', async (event, updatedItem) => {
    try {
        let data = getDataFromFile();
        
        // Tìm và thay thế item có ID trùng khớp
        data = data.map(item => item.id === updatedItem.id ? updatedItem : item);

        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        console.log("🔄 Đã cập nhật item ID:", updatedItem.id);
        return true;
    } catch (err) {
        console.error("Lỗi cập nhật:", err);
        return false;
    }
});
// 4. hàm xóa reminder
ipcMain.handle('delete-data', async (event, id) => {
    try {
        let data = getDataFromFile();
        data = data.filter(item => item.id !== id); // Giữ lại những cái KHÔNG TRÙNG ID
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        return false;
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});