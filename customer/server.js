// --- KHAI BÁO CÁC THƯ VIỆN CẦN THIẾT ---
const express = require('express');          
const mysql = require('mysql');              
const app = express();

// --- 1. THAY ĐỔI CỔNG THÀNH 8080 (Cho Customer Service) ---
const port = 8080;     

// --- SỬ DỤNG CONNECTION POOL (Thay vì Connection thường) ---
// Pool giúp tự động kết nối lại nếu bị ngắt mạng, tránh lỗi "Fatal error"

const pool = mysql.createPool({
  connectionLimit: 10,
  host: "coffee-db1.c3aeqo4k8fei.ap-southeast-2.rds.amazonaws.com", // Endpoint của bạn
  user: "admin",
  password: "lab-password",
  database: "COFFEE"
});

// --- HÀM TẠO GIAO DIỆN HTML (Đã lược bỏ các nút Thêm/Sửa) ---
function renderPage(title, content) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
            body { font-family: sans-serif; background-color: #f4f4f9; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #34495e; color: white; padding: 12px; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #ddd; }
            tr:hover { background-color: #f1f1f1; }
            .btn { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; text-decoration: none; font-size: 16px; cursor: pointer; }
            .btn-blue { background-color: #3498db; }
            .nav { margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
            .nav a { margin-right: 15px; color: #3498db; text-decoration: none; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            ${content}
        </div>
    </body>
    </html>
    `;
}

// --- CÁC ROUTE (ĐƯỜNG DẪN) ---

// 1. Trang chủ Customer
app.get('/', (req, res) => {
  const html = `
    <div style="text-align: center;">
        <h1>☕ Customer Home (Read Only)</h1>
        <p>Chào mừng các khách hàng yêu quý! Bạn có thể xem danh sách nhà cung cấp tại đây.</p>
        <br>
        <a href="/suppliers" class="btn btn-blue">📋 Xem Danh Sách Nhà Cung Cấp</a>
        
        <br><br>
        <hr>
        <p>Dành cho nhân viên:</p>
        <a href="/admin/suppliers" style="color: #e74c3c;">🔐 Administrator Link</a>
    </div>
  `;
  res.send(renderPage('Trang Chủ Khách Hàng', html));
});

// 2. Trang danh sách (Lấy dữ liệu thật từ Database)
app.get('/suppliers', (req, res) => {
  pool.query("SELECT * FROM suppliers", function (err, result) {
    if (err) {
        res.send(renderPage('Lỗi', `<h3>Không thể lấy dữ liệu từ DB</h3><p>${err.message}</p>`));
        return;
    }
    
    let rows = '';
    if (result && result.length > 0) {
        result.forEach(s => {
            rows += `<tr>
                <td>${s.id}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.email}</td>
            </tr>`;
        });
    } else {
        rows = '<tr><td colspan="3" style="text-align:center">Chưa có dữ liệu</td></tr>';
    }

    const html = `
        <h1>📋 Danh Sách Nhà Cung Cấp</h1>
        <table>
            <thead>
                <tr>
                    <th width="10%">ID</th>
                    <th width="40%">Tên</th>
                    <th width="50%">Email</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        <div class="nav">
            <a href="/">🏠 Trang Chủ</a>
            </div>
    `;
    res.send(renderPage('Danh Sách', html));
  });
});

// Đã XÓA route /supplier-add (GET và POST) để đảm bảo Read-only

// Khởi chạy Server
app.listen(port, () => {
  console.log(`🚀 Customer Service đang chạy tại Port ${port}`);
});