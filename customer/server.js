const express = require('express');
const mysql = require('mysql2');
const app = express();

const port = process.env.PORT || 8080;

// ================= DB CONFIG (Đồng bộ với Admin) =================
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.APP_DB_HOST || "coffee-db.c3aeqo4k8fei.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Coffee12345",
  database: process.env.DB_NAME || "coffee_db", // Trỏ thẳng vào coffee_db
  waitForConnections: true,
  enableKeepAlive: true
});

// Test kết nối
pool.getConnection((err, conn) => {
  if (err) console.error("❌ Customer Service kết nối RDS thất bại:", err.message);
  else {
    console.log("✅ Customer Service đã kết nối RDS thành công");
    conn.release();
  }
});

// ================= GIAO DIỆN CHUẨN COFFEE HUB =================
function renderPage(title, content) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');
            body { 
                font-family: 'Inter', sans-serif; 
                background-color: #e8f5e9; /* Màu xanh lá nhạt (Light Green) */
                color: #2e7d32;            /* Đổi màu chữ sang xanh đậm cho đồng bộ */
                margin: 0; 
                display: flex; justify-content: center; align-items: center; min-height: 100vh; 
            }
            .container { 
                width: 90%; max-width: 1000px; background: white; padding: 40px; 
                border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; 
            }
            h1 { font-family: 'Playfair Display', serif; color: #1b5e20; font-size: 2.2rem; margin-bottom: 10px; }
            .subtitle { color: #8d7765; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th { background-color: #634832; color: white; padding: 15px; text-align: left; }
            td { padding: 15px; border-bottom: 1px solid #eee; text-align: left; }
            tr:nth-child(even) { background-color: #fafafa; }
            .btn-main { 
                display: inline-flex; align-items: center; background-color: #634832; 
                color: white; padding: 12px 25px; border-radius: 50px; 
                text-decoration: none; font-weight: 600; transition: 0.3s; gap: 10px;
            }
            .btn-main:hover { background-color: #4e3828; transform: translateY(-2px); }
            .back-link { display: inline-block; margin-top: 25px; color: #634832; text-decoration: none; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">${content}</div>
    </body>
    </html>`;
}

// ================= ROUTES =================

// Health Check cho Load Balancer (Sửa lỗi Unhealthy)
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/health-check', (req, res) => res.status(200).send('OK'));

// Trang chủ
app.get('/', (req, res) => {
  res.send(renderPage('Coffee Hub Customer', `
    <h1>☕ Coffee Hub Customer</h1>
    <p class="subtitle">Tra cứu thông tin đối tác và nhà cung cấp chi tiết.</p>
    <a href="/suppliers" class="btn-main"><span>☰</span> Xem Danh Sách</a>
    <br><br>
    <a href="/admin" style="color: #d32f2f; font-size: 0.8rem; text-decoration: none;">Đăng nhập Admin</a>
  `));
});

// Trang danh sách (Phần bạn yêu cầu sửa)
app.get('/suppliers', (req, res) => {
  // Sử dụng coffee_db.suppliers để đảm bảo lấy đúng bảng
  pool.query("SELECT * FROM coffee_db.suppliers", (err, result) => {
    if (err) {
        console.error("Query Error:", err.message);
        return res.send(renderPage('Lỗi', `<h3>❌ Không thể kết nối dữ liệu</h3><p>${err.message}</p>`));
    }

    let rows = '';
    if (result && result.length > 0) {
        rows = result.map(s => `
            <tr>
              <td><strong>${s.name}</strong></td>
              <td>${s.email || 'N/A'}</td>
              <td>${s.phone || '0379XXXXXX'}</td>
              <td>${s.address || 'Đường Đoàn Thị Kia'}</td>
              <td>${s.city || 'Bình Dương'}</td>
            </tr>`).join('');
    }

    res.send(renderPage('Danh Sách Nhà Cung Cấp', `
      <h1>📋 Đối Tác Nhà Cung Cấp</h1>
      <table>
        <thead>
            <tr>
                <th>Tên Đơn Vị</th>
                <th>Email</th>
                <th>SĐT</th>
                <th>Văn Phòng</th>
                <th>Khu Vực</th>
            </tr>
        </thead>
        <tbody>
            ${rows ? rows : '<tr><td colspan="5" style="text-align:center">📭 Hiện chưa có dữ liệu nhà cung cấp nào.</td></tr>'}
        </tbody>
      </table>
      <a href="/" class="back-link">🏠 Quay lại trang chủ</a>
    `));
  });
});

app.listen(port, () => {
  console.log(`🚀 Customer Service đang chạy tại port ${port}`);
});