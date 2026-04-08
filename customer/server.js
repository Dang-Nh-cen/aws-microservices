const express = require('express');
const mysql = require('mysql2');
const app = express();

const port = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= DB CONFIG (Amazon RDS) =================
// Không để database: "coffee_db" ở đây để tránh lỗi sập app khi DB chưa được tạo
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.APP_DB_HOST || "coffee-db.c3aeqo4k8fei.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Coffee12345",
  waitForConnections: true,
  enableKeepAlive: true
});

// ================= TỰ ĐỘNG KHỞI TẠO DATABASE & TABLE =================
const initDatabase = () => {
  // Bước 1: Tạo Database nếu chưa có
  pool.query("CREATE DATABASE IF NOT EXISTS coffee_db", (err) => {
    if (err) {
      console.error("❌ Lỗi tạo Database:", err.message);
      return;
    }
    console.log("✅ Database 'coffee_db' đã sẵn sàng.");

    // Bước 2: Tạo Bảng (Dùng tên đầy đủ: coffee_db.suppliers)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS coffee_db.suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20) DEFAULT '0379XXXXXX',
        address VARCHAR(255) DEFAULT 'Đường Đoàn Thị Kia',
        city VARCHAR(100) DEFAULT 'Bình Dương',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    pool.query(createTableQuery, (err) => {
      if (err) console.error("❌ Lỗi khởi tạo bảng:", err.message);
      else console.log("✅ Bảng 'suppliers' đã sẵn sàng phục vụ.");
    });
  });
};

// Kiểm tra kết nối
pool.getConnection((err, conn) => {
  if (err) console.error("❌ Kết nối RDS thất bại:", err.message);
  else {
    console.log("✅ Connected to RDS từ Customer Service");
    conn.release();
    initDatabase(); 
  }
});

// ================= GIAO DIỆN & ROUTES =================
function renderPage(title, content) {
    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #f8f9fa; color: #4a3728; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .container { width: 95%; max-width: 1000px; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; }
        h1 { font-family: 'Playfair Display', serif; color: #5d4037; font-size: 2.2rem; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #634832; color: white; padding: 15px; text-align: left; }
        td { padding: 15px; border-bottom: 1px solid #f0f0f0; text-align: left; }
        .btn-view { display: inline-flex; align-items: center; background-color: #634832; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .admin-link { display: block; margin-top: 20px; color: #d32f2f; text-decoration: none; font-size: 0.85rem; }
    </style></head><body><div class="container">${content}</div></body></html>`;
}

app.get('/', (req, res) => {
  res.send(renderPage('Coffee Hub', `
    <h1>☕ Coffee Hub Customer</h1>
    <p>Tra cứu thông tin đối tác và nhà cung cấp hạt cà phê.</p>
    <a href="/suppliers" class="btn-view">☰ Xem Danh Sách</a>
    <a href="/admin" class="admin-link">🔐 Administrator Link (Dành cho nhân viên)</a>
  `));
});

app.get('/suppliers', (req, res) => {
  // QUAN TRỌNG: Phải dùng coffee_db.suppliers ở đây
  pool.query("SELECT * FROM coffee_db.suppliers", (err, result) => {
    if (err) return res.send(renderPage('Lỗi', `<h3>❌ Lỗi: ${err.message}</h3>`));

    let rows = result.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.email}</td>
          <td>${s.phone || 'N/A'}</td>
          <td>${s.address || 'N/A'}</td>
          <td>${s.city || 'N/A'}</td>
        </tr>`).join('');

    res.send(renderPage('Danh Sách', `
      <h1>📋 Đối Tác Nhà Cung Cấp</h1>
      <table>
        <thead><tr><th>Tên Đơn Vị</th><th>Email</th><th>SĐT</th><th>Văn Phòng</th><th>Khu Vực</th></tr></thead>
        <tbody>${rows.length > 0 ? rows : '<tr><td colspan="5" style="text-align:center">Đang cập nhật dữ liệu...</td></tr>'}</tbody>
      </table>
      <br><a href="/" style="text-decoration:none; color:#634832;">🏠 Quay lại trang chủ</a>
    `));
  });
});

app.listen(port, () => console.log(`🚀 Customer Service running on port ${port}`));