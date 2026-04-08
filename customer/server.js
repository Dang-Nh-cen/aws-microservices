const express = require('express');
const mysql = require('mysql2');
const app = express();

// Cổng chạy ứng dụng
const port = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= DB CONFIG =================
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.APP_DB_HOST || "coffee-db.c3aeqo4k8fei.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Coffee12345",
  database: process.env.DB_NAME || "coffee_db",
  waitForConnections: true
});

// Test kết nối
pool.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB connection failed:", err.message);
  } else {
    console.log("✅ Connected to RDS");
    conn.release();
  }
});

// ================= GIAO DIỆN (CSS & Layout giống hình) =================
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
                background-color: #f8f9fa; /* Nền xám rất nhạt */
                color: #4a3728; 
                margin: 0; 
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container { 
                width: 95%;
                max-width: 1000px; 
                background: white; 
                padding: 40px; 
                border-radius: 12px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                text-align: center;
            }
            h1 { 
                font-family: 'Playfair Display', serif; 
                color: #5d4037; 
                font-size: 2.2rem;
                margin-top: 0;
            }
            p.description { color: #777; margin-bottom: 30px; }

            /* Table Style */
            .table-container { overflow-x: auto; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th { 
                background-color: #634832; 
                color: white; 
                padding: 15px; 
                text-align: left; 
            }
            td { padding: 15px; border-bottom: 1px solid #f0f0f0; text-align: left; }
            tr:hover { background-color: #fafafa; }
            
            /* Buttons */
            .btn-view { 
                display: inline-flex; 
                align-items: center;
                background-color: #634832; 
                color: white; 
                padding: 12px 24px; 
                border-radius: 8px; 
                text-decoration: none; 
                font-weight: 600;
                transition: 0.2s;
            }
            .btn-view:hover { background-color: #4e3828; }
            
            .btn-back {
                display: inline-block;
                margin-top: 25px;
                background: #634832;
                color: white;
                padding: 10px 25px;
                border-radius: 50px;
                text-decoration: none;
                font-size: 14px;
            }

            .admin-link {
                display: block;
                margin-top: 20px;
                color: #d32f2f;
                text-decoration: none;
                font-size: 0.85rem;
                border-bottom: 1px solid transparent;
            }
            .admin-link:hover { border-bottom-color: #d32f2f; }
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

// ================= ROUTES =================

// TRANG CHỦ (Giống hình 1)
app.get('/', (req, res) => {
  res.send(renderPage('Coffee Hub', `
    <h1>☕ Coffee Hub Customer</h1>
    <p class="description">Tra cứu thông tin đối tác và nhà cung cấp chi tiết.</p>
    
    <a href="/suppliers" class="btn-view">
        <span style="margin-right:8px;">☰</span> Xem Danh Sách
    </a>
    
   // Tìm đoạn này trong app.get('/') và sửa lại:
    <a href="/admin" class="admin-link">🔐 Administrator Link (Dành cho nhân viên)</a>
  `));
});

// TRANG DANH SÁCH (Đã tối ưu hiển thị)
app.get('/suppliers', (req, res) => {
  pool.query("SELECT * FROM suppliers", (err, result) => {
    if (err) {
      return res.send(renderPage('Lỗi Hệ Thống', `<h3>❌ Không thể kết nối dữ liệu: ${err.message}</h3>`));
    }

    let rows = result.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.email}</td>
          <td>${s.phone || 'N/A'}</td>
          <td>${s.address || 'N/A'}</td>
          <td style="color: #888;">${s.city || 'Bình Dương'}</td>
        </tr>
    `).join('');

    res.send(renderPage('Danh Sách Nhà Cung Cấp', `
      <h1>📋 Đối Tác Nhà Cung Cấp</h1>
      <p style="text-align:left; color:#666;">Dưới đây là danh sách các đơn vị cung ứng hạt cà phê chất lượng cao trong hệ thống.</p>
      <div class="table-container">
          <table>
            <thead>
                <tr>
                    <th>Tên Đơn Vị</th>
                    <th>Email Liên Hệ</th>
                    <th>Số Điện Thoại</th>
                    <th>Văn Phòng</th>
                    <th>Khu Vực</th>
                </tr>
            </thead>
            <tbody>
                ${rows.length > 0 ? rows : '<tr><td colspan="5" style="text-align:center">Đang cập nhật dữ liệu...</td></tr>'}
            </tbody>
          </table>
      </div>
      <a href="/" class="btn-back">🏠 Quay lại trang chủ</a>
    `));
  });
});
// KHỞI CHẠY
app.listen(port, () => {
  console.log(`🚀 Customer Service running on port ${port}`);
});