const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

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