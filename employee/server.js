const express = require('express');
const mysql = require('mysql2');
const app = express();

// PORT: 8081 cho local, ưu tiên biến môi trường PORT từ ECS (8080)
const port = process.env.PORT || 8081;

// Middleware để đọc dữ liệu từ Form POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= DB CONFIG (RDS) =================
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.APP_DB_HOST || "coffee-db.c3aeqo4k8fei.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Coffee12345",
  database: process.env.DB_NAME || "coffee_db",
  waitForConnections: true
});

// Kiểm tra kết nối khi khởi động
pool.getConnection((err, conn) => {
  if (err) console.error("❌ Kết nối RDS thất bại:", err.message);
  else {
    console.log("✅ Đã kết nối thành công tới Amazon RDS");
    conn.release();
  }
});

// ================= HÀM RENDER GIAO DIỆN =================
function renderPage(title, content) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>${title} | Admin</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #fdfaf7; color: #4a3728; margin: 0; padding-top: 50px; display: flex; justify-content: center; }
        .container { width: 95%; max-width: 1000px; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        h1 { font-family: 'Playfair Display', serif; color: #5d4037; border-bottom: 2px solid #634832; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #634832; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .btn { padding: 8px 15px; border-radius: 5px; text-decoration: none; font-weight: 600; border: none; cursor: pointer; display: inline-block; }
        .btn-add { background: #2e7d32; color: white; margin-bottom: 20px; }
        .btn-edit { background: #1976d2; color: white; }
        .btn-delete { background: #d32f2f; color: white; }
        .btn-save { background: #634832; color: white; width: 100%; margin-top: 10px; }
        .btn-back { background: #f1f1f1; color: #555; margin-top: 20px; }
        .form-group { margin-bottom: 15px; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div class="container">${content}</div>
  </body>
  </html>`;
}

// ================= ROUTES =================

// 1. Dashboard
app.get('/admin', (req, res) => {
  res.send(renderPage("Dashboard", `
    <h1>🛡️ Hệ thống Quản trị Coffee Hub</h1>
    <p>Chào mừng Admin. Vui lòng chọn chức năng:</p>
    <div style="display: flex; gap: 20px; margin-top: 20px;">
        <a href="/admin/suppliers" class="btn btn-save" style="text-align:center; padding: 20px;">📋 Quản lý Nhà cung cấp</a>
        <a href="/" class="btn btn-back" style="text-align:center; padding: 20px;">🌐 Xem trang Khách hàng</a>
    </div>
  `));
});

// 2. Danh sách (Read)
app.get('/admin/suppliers', (req, res) => {
  pool.query("SELECT * FROM suppliers", (err, result) => {
    if (err) return res.status(500).send(err.message);

    let rows = result.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td><b>${s.name}</b></td>
        <td>${s.email}</td>
        <td>
          <a href="/admin/supplier-edit/${s.id}" class="btn btn-edit">Sửa</a>
          <form method="POST" action="/admin/supplier-delete/${s.id}" style="display:inline;" onsubmit="return confirm('Xóa nhà cung cấp này?')">
            <button class="btn btn-delete">Xóa</button>
          </form>
        </td>
      </tr>`).join('');

    res.send(renderPage("Danh sách", `
      <h1>📋 Danh sách Nhà Cung Cấp</h1>
      <a href="/admin/supplier-add" class="btn btn-add">＋ Thêm Mới</a>
      <table>
        <thead><tr><th>ID</th><th>Tên</th><th>Email</th><th>Thao tác</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">Trống</td></tr>'}</tbody>
      </table>
      <a href="/admin" class="btn btn-back">← Quay lại</a>
    `));
  });
});

// 3. Thêm mới (Create)
app.get('/admin/supplier-add', (req, res) => {
  res.send(renderPage("Thêm mới", `
    <h1>➕ Thêm Nhà Cung Cấp</h1>
    <form method="POST">
      <div class="form-group"><label>Tên:</label><input name="name" required></div>
      <div class="form-group"><label>Email:</label><input name="email" type="email" required></div>
      <button class="btn btn-save">Lưu lại</button>
      <center><a href="/admin/suppliers" class="btn btn-back">Hủy</a></center>
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

// 4. Chỉnh sửa (Update)
app.get('/admin/supplier-edit/:id', (req, res) => {
  pool.query("SELECT * FROM suppliers WHERE id = ?", [req.params.id], (err, result) => {
    if (err || result.length === 0) return res.send("Không tìm thấy!");
    const s = result[0];
    res.send(renderPage("Sửa", `
      <h1>📝 Chỉnh sửa thông tin</h1>
      <form method="POST" action="/admin/supplier-update">
        <input type="hidden" name="id" value="${s.id}">
        <div class="form-group"><label>Tên:</label><input name="name" value="${s.name}" required></div>
        <div class="form-group"><label>Email:</label><input name="email" type="email" value="${s.email}" required></div>
        <button class="btn btn-save">Cập nhật</button>
        <center><a href="/admin/suppliers" class="btn btn-back">Quay lại</a></center>
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

// 5. Xóa (Delete)
app.post('/admin/supplier-delete/:id', (req, res) => {
  pool.query("DELETE FROM suppliers WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.send(err.message);
    res.redirect('/admin/suppliers');
  });
});

app.listen(port, () => console.log(`🚀 Employee Service chạy tại port ${port}`));