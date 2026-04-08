# Sử dụng Node.js phiên bản 11 rút gọn (alpine) làm nền
FROM public.ecr.aws/docker/library/node:16-alpine


# Tạo thư mục chứa code trong container
RUN mkdir -p /usr/src/app

# Thiết lập thư mục làm việc
WORKDIR /usr/src/app

# Copy toàn bộ code từ máy ngoài vào trong container
COPY . .

# Cài đặt các thư viện cần thiết
RUN npm install

# Mở cổng 8080 để bên ngoài truy cập được
EXPOSE 8080

# Lệnh chạy ứng dụng khi container khởi động
CMD ["npm", "run", "start"]
