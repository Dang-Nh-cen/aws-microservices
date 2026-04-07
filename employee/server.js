// --- EMPLOYEE SERVICE (PORT 8081) - Admin Path & DB Pool ---
// Đã thêm chức năng: SỬA (Update) và XÓA (Delete)

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2'); 
const app = express();

const port = 8081;

app.use(bodyParser.urlencoded({ extended: true }));

// 1. KẾT NỐI DATABASE
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "coffee-db1.c3aeqo4k8fei.ap-southeast-2.rds.amazonaws.com", 
  user: "admin",
  password: "lab-password",
  database: "COFFEE",
  connectTimeout: 60000,
  waitForConnections: true,
  queueLimit: 0
});

// Hàm hỗ trợ render giao diện HTML
function renderPage(title, content) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head><meta charset="UTF-8"><title>${title}</title></head>
    <body style="font-family: sans-serif; padding: 20px; background: #fff0f0;">
        <div style="border-bottom: 2px solid #c0392b; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color: #c0392b; display: inline;">🛡️ Quản Lý (Admin)</h1>
            <span style="float: right;">
                <a href="/admin/">Trang chủ Admin</a> | 
                <a href="/">Về trang Khách hàng</a>
            </span>
        </div>
        ${content}
    </body>
    </html>`;
}

// --- CÁC ROUTE XỬ LÝ ---

// Trang chủ Admin
app.get('/admin', (req, res) => {
    res.send(renderPage("Admin Home", `
        <h3>Chào mừng các quản trị viên!</h3>
        <ul>
            <li><a href="/admin/suppliers">📋 Quản lý danh sách nhà cung cấp</a></li>
            <li><a href="/admin/supplier-add">➕ Thêm nhà cung cấp mới</a></li>
        </ul>
    `));
});

// 1. DANH SÁCH (Đã thêm cột hành động Sửa/Xóa)
app.get('/admin/suppliers', (req, res) => {
    pool.query("SELECT * FROM suppliers", function (err, result) {
        if (err) return res.send(renderPage("Lỗi", `<p>Lỗi DB: ${err.message}</p>`));
        
        let rows = '';
        if (result && result.length > 0) {
            rows = result.map(s => `<tr>
                <td style="padding:10px; border-bottom:1px solid #ddd;">${s.id}</td>
                <td style="padding:10px; border-bottom:1px solid #ddd;"><strong>${s.name}</strong></td>
                <td style="padding:10px; border-bottom:1px solid #ddd;">${s.email}</td>
                <td style="padding:10px; border-bottom:1px solid #ddd;">
                    <a href="/admin/supplier-edit/${s.id}" style="color: blue; text-decoration: none; margin-right: 15px;">✏️ Sửa</a>
                    <a href="/admin/supplier-delete/${s.id}" onclick="return confirm('Bạn có chắc muốn xóa nhà cung cấp: ${s.name}?')" style="color: red; text-decoration: none;">🗑️ Xóa</a>
                </td>
            </tr>`).join('');
        }
        res.send(renderPage("Danh sách", `
            <h2>Danh sách nhà cung cấp</h2>
            <table style="width:100%; border-collapse: collapse; background: white;">
                <tr style="background: #c0392b; color: white;">
                    <th style="padding:10px; text-align:left;">ID</th>
                    <th style="padding:10px; text-align:left;">Tên</th>
                    <th style="padding:10px; text-align:left;">Email</th>
                    <th style="padding:10px; text-align:left;">Hành động</th>
                </tr>
                ${rows}
            </table>
            <br>
            <a href="/admin/supplier-add" style="background: #c0392b; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">➕ Thêm mới</a>
        `));
    });
});

// 2. THÊM MỚI (Form)
app.get('/admin/supplier-add', (req, res) => {
    res.send(renderPage("Thêm mới", `
        <h2>Thêm Nhà Cung Cấp</h2>
        <form method="POST" action="/admin/supplier-add" style="background: white; padding: 20px; border-radius: 5px;">
            <label>Tên:</label><br>
            <input type="text" name="name" required style="width: 100%; padding: 8px; margin: 5px 0;"><br><br>
            <label>Email:</label><br>
            <input type="email" name="email" required style="width: 100%; padding: 8px; margin: 5px 0;"><br><br>
            <button type="submit" style="background: #c0392b; color: white; padding: 10px 20px; border: none; cursor: pointer;">Lưu dữ liệu</button>
            <a href="/admin/suppliers" style="margin-left: 10px;">Hủy</a>
        </form>
    `));
});

// 2. THÊM MỚI (Xử lý lưu)
app.post('/admin/supplier-add', (req, res) => {
    pool.query("INSERT INTO suppliers (name, email) VALUES (?, ?)", 
        [req.body.name, req.body.email], 
        function (err, result) {
            if (err) return res.send(`Lỗi thêm mới: ${err.message}`);
            res.redirect('/admin/suppliers');
    });
});

// 3. CHỨC NĂNG XÓA (Delete)
app.get('/admin/supplier-delete/:id', (req, res) => {
    const id = req.params.id;
    pool.query("DELETE FROM suppliers WHERE id = ?", [id], function(err, result) {
        if (err) return res.send(`Lỗi khi xóa: ${err.message}`);
        res.redirect('/admin/suppliers'); // Xóa xong quay về danh sách
    });
});

// 4. CHỨC NĂNG SỬA (Update)

// Bước 4.1: Hiển thị form sửa (Lấy dữ liệu cũ điền vào ô input)
app.get('/admin/supplier-edit/:id', (req, res) => {
    const id = req.params.id;
    pool.query("SELECT * FROM suppliers WHERE id = ?", [id], function(err, result) {
        if (err) return res.send(`Lỗi DB: ${err.message}`);
        if (result.length === 0) return res.send("Không tìm thấy ID này");

        const data = result[0]; // Lấy dòng dữ liệu đầu tiên
        
        res.send(renderPage("Cập nhật", `
            <h2>Cập nhật Nhà Cung Cấp (ID: ${data.id})</h2>
            <form method="POST" action="/admin/supplier-update" style="background: white; padding: 20px; border-radius: 5px;">
                <input type="hidden" name="id" value="${data.id}">
                
                <label>Tên:</label><br>
                <input type="text" name="name" value="${data.name}" required style="width: 100%; padding: 8px; margin: 5px 0;"><br><br>
                
                <label>Email:</label><br>
                <input type="email" name="email" value="${data.email}" required style="width: 100%; padding: 8px; margin: 5px 0;"><br><br>
                
                <button type="submit" style="background: #2980b9; color: white; padding: 10px 20px; border: none; cursor: pointer;">Cập nhật</button>
                <a href="/admin/suppliers" style="margin-left: 10px;">Hủy</a>
            </form>
        `));
    });
});

// Bước 4.2: Xử lý cập nhật vào Database
app.post('/admin/supplier-update', (req, res) => {
    const { id, name, email } = req.body;
    pool.query("UPDATE suppliers SET name = ?, email = ? WHERE id = ?", 
        [name, email, id], 
        function (err, result) {
            if (err) return res.send(`Lỗi cập nhật: ${err.message}`);
            res.redirect('/admin/suppliers'); // Sửa xong quay về danh sách
    });
});

app.listen(port, () => {
    console.log(`🚀 Employee Service running on port ${port} with /admin prefix`);
});