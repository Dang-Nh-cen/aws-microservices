const express = require('express');
const mysql = require('mysql2');
const app = express();

// Port 8081 để khớp với cấu hình Target Group hiện tại của bạn trên AWS
const port = process.env.PORT || 8081;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= DB CONFIG (Amazon RDS) =================
const dbConfig = {
  connectionLimit: 10,
  host: process.env.APP_DB_HOST || "coffee-db.c3aeqo4k8fei.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Coffee12345",
  database: process.env.DB_NAME || "coffee_db", // Chỉ định trực tiếp DB ở đây
  waitForConnections: true,
  enableKeepAlive: true
};

const pool = mysql.createPool(dbConfig);

// ================= TỰ ĐỘNG KHỞI TẠO TABLE =================
const initTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS suppliers (
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
      console.log("✅ Bảng 'suppliers' đã sẵn sàng.");
    }
  });
};

// Kiểm tra kết nối
pool.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Kết nối RDS thất bại:", err.message);
  } else {
    console.log("✅ Đã kết nối thành công tới Amazon RDS");
    conn.release();
    initTable();
  }
});

// ================= HÀM RENDER GIAO DIỆN =================
function renderPage(title, content) {
  return `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Coffee Hub Admin</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #fdfaf7; color: #4a3728; margin: 0; padding: 20px; display: flex; justify-content: center; }
        .container { width: 95%; max-width: 1000px; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); margin-top: 30px;}
        h1 { font-family: 'Playfair Display', serif; color: #5d4037; border-bottom: 2px solid #634832; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #634832; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .btn { padding: 8px 15px; border-radius: 5px; text-decoration: none; font-weight: 600; border: none; cursor: pointer; display: inline-block; transition: 0.2s; font-size: 14px; }
        .btn-add { background: #2e7d32; color: white; margin-bottom: 20px; }
        .btn-edit { background: #1976d2; color: white; margin-right: 5px; }
        .btn-delete { background: #d32f2f; color: white; }
        .btn-save { background: #634832; color: white; width: 100%; margin-top: 10px; font-size: 16px; padding: 12px; }
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

/**
 * 0. HEALTH CHECK ROUTE (Quan trọng nhất cho AWS ECS)
 * Giúp Load Balancer xác định container đang "Healthy"
 */
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'employee-service' });
});

// 1. Dashboard Admin
app.get('/admin', (req, res) => {
  res.send(renderPage("Dashboard", `
    <h1>🛡️ Hệ thống Quản trị Coffee Hub</h1>
    <p>Chào mừng Admin. Vui lòng chọn chức năng quản lý:</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
        <a href="/admin/suppliers" class="btn btn-save" style="text-align:center; padding: 30px;">📋 Quản lý Nhà cung cấp</a>
        <a href="/suppliers" class="btn btn-back" style="text-align:center; padding: 30px; background: #8d7765; color: white;">🌐 Xem trang Khách hàng</a>
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
        <td>${s.email || 'N/A'}</td>
        <td>
          <div style="display: flex;">
            <a href="/admin/supplier-edit/${s.id}" class="btn btn-edit">Sửa</a>
            <form method="POST" action="/admin/supplier-delete/${s.id}" onsubmit="return confirm('Bạn có chắc chắn muốn xóa?')">
              <button class="btn btn-delete">Xóa</button>
            </form>
          </div>
        </td>
      </tr>`).join('');

    res.send(renderPage("Danh sách", `
      <h1>📋 Danh sách Nhà Cung Cấp</h1>
      <a href="/admin/supplier-add" class="btn btn-add">＋ Thêm Nhà Cung Cấp Mới</a>
      <table>
        <thead>
            <tr><th>ID</th><th>Tên Nhà Cung Cấp</th><th>Email</th><th>Thao tác</th></tr>
        </thead>
        <tbody>
            ${rows || '<tr><td colspan="4" style="text-align:center">Chưa có dữ liệu</td></tr>'}
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
      <div class="form-group"><label>Email:</label><input name="email" type="email" required placeholder="example@coffee.com"></div>
      
      <div class="form-group"><label>Số điện thoại (SĐT):</label><input name="phone" placeholder="0379XXXXXX"></div>
      <div class="form-group"><label>Văn phòng (Địa chỉ):</label><input name="address" placeholder="Đường Đoàn Thị Kia..."></div>
      <div class="form-group"><label>Khu vực (Thành phố):</label><input name="city" placeholder="Bình Dương..."></div>
      
      <button class="btn btn-save">Lưu vào Hệ thống</button>
      <center><a href="/admin/suppliers" class="btn btn-back">Hủy bỏ</a></center>
    </form>
  `));
});

app.post('/admin/supplier-add', (req, res) => {
  const { name, email, phone, address, city } = req.body;
  
  const query = "INSERT INTO suppliers (name, email, phone, address, city) VALUES (?, ?, ?, ?, ?)";
  pool.query(query, [name, email, phone, address, city], (err) => {
    if (err) return res.send("Lỗi lưu dữ liệu: " + err.message);
    res.redirect('/admin/suppliers');
  });
});

// 4. Chỉnh sửa
app.get('/admin/supplier-edit/:id', (req, res) => {
  pool.query("SELECT * FROM suppliers WHERE id = ?", [req.params.id], (err, result) => {
    if (err || result.length === 0) return res.send("Không tìm thấy!");
    const s = result[0];
    res.send(renderPage("Sửa", `
      <h1>📝 Chỉnh sửa thông tin</h1>
      <form method="POST" action="/admin/supplier-update">
        <input type="hidden" name="id" value="${s.id}">
        <div class="form-group"><label>Tên nhà cung cấp:</label><input name="name" value="${s.name}" required></div>
        <div class="form-group"><label>Email:</label><input name="email" type="email" value="${s.email}" required></div>
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

// ================= KHỞI CHẠY =================
app.listen(port, () => {
  console.log(`✅ Employee Service đang chạy tại port ${port}`);
});