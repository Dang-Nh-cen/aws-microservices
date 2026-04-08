# Dùng Node 16 cho ổn định
FROM public.ecr.aws/docker/library/node:16-alpine

# Tạo thư mục app
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Copy code
COPY . .

# Cài thư viện
RUN npm install

# Mở cổng 8080 (Cổng của Employee)
EXPOSE 8081

# Chạy app
CMD ["npm", "run", "start"]
