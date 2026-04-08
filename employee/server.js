const express = require('express');
const mysql = require('mysql2');
const app = express();

// CHÚ Ý: Đổi về 8080 để khớp với cấu hình Target Group thông thường trên ECS
const port = process.env.PORT || 8080;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= DB CONFIG (Amazon RDS) =================
// ================= DB CONFIG (Amazon RDS) =================
// Lưu ý: Chúng ta tạo pool kết nối vào Host, chưa chỉ định database ngay để tránh lỗi "Unknown database"
const dbConfig = {
  connectionLimit: 10,
  host: process.env.APP_DB_HOST || "coffee-db.c3aeqo4k8fei.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Coffee12345",
  waitForConnections: true,
  enableKeepAlive: true
};

const pool = mysql.createPool(dbConfig);

// ================= TỰ ĐỘNG KHỞI TẠO DATABASE & TABLE =================
const initDatabase = () => {
  // Bước 1: Tạo Database nếu chưa có
  pool.query("CREATE DATABASE IF NOT EXISTS coffee_db", (err) => {
    if (err) {
      console.error("❌ Lỗi tạo Database:", err.message);
      return;
    }
    console.log("✅ Database 'coffee_db' đã sẵn sàng.");

    // Bước 2: Chỉ định sử dụng Database này và tạo Bảng
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
      if (err) {
        console.error("❌ Lỗi khởi tạo bảng suppliers:", err.message);
      } else {
        console.log("✅ Bảng 'suppliers' đã sẵn sàng bên trong 'coffee_db'.");
      }
    });
  });
};

// Kiểm tra kết nối và chạy khởi tạo
pool.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Kết nối RDS thất bại:", err.message);
  } else {
    console.log("✅ Đã kết nối thành công tới Amazon RDS");
    conn.release();
    initDatabase();
  }
});

// Chỉnh lại các câu query trong các Route để chỉ định rõ database
// Ví dụ: pool.query("SELECT * FROM coffee_db.suppliers", ...)

// ================= HÀM RENDER GIAO DIỆN =================
function renderPage(title, content) {
  return `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <title>${title} | Coffee Hub Admin</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #fdfaf7; color: #4a3728; margin: 0; padding-top: 50px; display: flex; justify-content: center; }
        .container { width: 95%; max-width: 1000px; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        h1 { font-family: 'Playfair Display', serif; color: #5d4037; border-bottom: 2px solid #634832; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #634832; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .btn { padding: 8px 15px; border-radius: 5px; text-decoration: none; font-weight: 600; border: none; cursor: pointer; display: inline-block; transition: 0.2s; }
        .btn-add { background: #2e7d32; color: white; margin-bottom: 20px; }
        .btn-edit { background: #1976d2; color: white; margin-right: 5px; }
        .btn-delete { background: #d32f2f; color: white; }
        .btn-save { background: #634832; color: white; width: 100%; margin-top: 10px; font-size: 16px; }
        .btn-back { background: #f1f1f1; color: #555; margin-top: 20px; }
        .btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .form-group { margin-bottom: 15px; text-align: left; }
        label { display: block; margin-bottom: 5px; font-weight: 600; }
        input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div class="container">${content}</div>
  </body>
  </html>`;
}

// ================= ROUTES =================

// 1. Dashboard (Trang chủ Admin)
app.get('/admin', (req, res) => {
  res.send(renderPage("Dashboard", `
    <h1>🛡️ Hệ thống Quản trị Coffee Hub</h1>
    <p>Chào mừng Admin. Vui lòng chọn chức năng quản lý:</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
        <a href="/admin/suppliers" class="btn btn-save" style="text-align:center; padding: 30px;">📋 Quản lý Nhà cung cấp</a>
        <a href="/" class="btn btn-back" style="text-align:center; padding: 30px;">🌐 Quay về trang Khách hàng</a>
    </div>
  `));
});

// 2. Danh sách Nhà cung cấp
app.get('/admin/suppliers', (req, res) => {
  pool.query("SELECT * FROM suppliers", (err, result) => {
    if (err) return res.status(500).send(renderPage("Lỗi", `<p>❌ Lỗi truy vấn: ${err.message}</p>`));

    let rows = result.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td><b>${s.name}</b></td>
        <td>${s.email || s.contact || 'N/A'}</td>
        <td>
          <a href="/admin/supplier-edit/${s.id}" class="btn btn-edit">Sửa</a>
          <form method="POST" action="/admin/supplier-delete/${s.id}" style="display:inline;" onsubmit="return confirm('Bạn có chắc chắn muốn xóa?')">
            <button class="btn btn-delete">Xóa</button>
          </form>
        </td>
      </tr>`).join('');

    res.send(renderPage("Danh sách", `
      <h1>📋 Danh sách Nhà Cung Cấp</h1>
      <a href="/admin/supplier-add" class="btn btn-add">＋ Thêm Nhà Cung Cấp Mới</a>
      <table>
        <thead>
            <tr><th>ID</th><th>Tên Nhà Cung Cấp</th><th>Email/Liên hệ</th><th>Thao tác</th></tr>
        </thead>
        <tbody>
            ${rows || '<tr><td colspan="4" style="text-align:center">Chưa có dữ liệu trong Database</td></tr>'}
        </tbody>
      </table>
      <a href="/admin" class="btn btn-back">← Quay lại Dashboard</a>
    `));
  });
});

// 3. Thêm mới
app.get('/admin/supplier-add', (req, res) => {
  res.send(renderPage("Thêm mới", `
    <h1>➕ Thêm Nhà Cung Cấp</h1>
    <form method="POST" action="/admin/supplier-add">
      <div class="form-group"><label>Tên nhà cung cấp:</label><input name="name" required placeholder="Ví dụ: Highland Coffee"></div>
      <div class="form-group"><label>Email/Liên hệ:</label><input name="email" type="text" required placeholder="example@coffee.com"></div>
      <button class="btn btn-save">Lưu vào Hệ thống</button>
      <center><a href="/admin/suppliers" class="btn btn-back">Hủy bỏ</a></center>
    </form>
  `));
});

app.post('/admin/supplier-add', (req, res) => {
  const { name, email } = req.body;
  pool.query("INSERT INTO suppliers (name, email) VALUES (?, ?)", [name, email], (err) => {
    if (err) return res.send(err.message);
    res.redirect('/admin/suppliers');
  });
});

// 4. Chỉnh sửa
app.get('/admin/supplier-edit/:id', (req, res) => {
  pool.query("SELECT * FROM suppliers WHERE id = ?", [req.params.id], (err, result) => {
    if (err || result.length === 0) return res.send("Không tìm thấy nhà cung cấp này!");
    const s = result[0];
    res.send(renderPage("Sửa", `
      <h1>📝 Chỉnh sửa thông tin</h1>
      <form method="POST" action="/admin/supplier-update">
        <input type="hidden" name="id" value="${s.id}">
        <div class="form-group"><label>Tên nhà cung cấp:</label><input name="name" value="${s.name}" required></div>
        <div class="form-group"><label>Email/Liên hệ:</label><input name="email" value="${s.email || s.contact}" required></div>
        <button class="btn btn-save">Cập nhật thay đổi</button>
        <center><a href="/admin/suppliers" class="btn btn-back">Quay lại danh sách</a></center>
      </form>
    `));
  });
});

app.post('/admin/supplier-update', (req, res) => {
  const { id, name, email } = req.body;
  pool.query("UPDATE suppliers SET name=?, email=? WHERE id=?", [name, email, id], (err) => {
    if (err) return res.send(err.message);
    res.redirect('/admin/suppliers');
  });
});

// 5. Xóa
app.post('/admin/supplier-delete/:id', (req, res) => {
  pool.query("DELETE FROM suppliers WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.send(err.message);
    res.redirect('/admin/suppliers');
  });
});

app.listen(port, () => console.log(`🚀 Employee Service đang chạy thành công tại port ${port}`));