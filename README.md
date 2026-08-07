# HƯỚNG DẪN CÀI ĐẶT

### Yêu cầu môi trường

- **Node.js**: Phiên bản `v18.x` trở lên (khuyên dùng LTS).
- **Trình quản lý gói**: `npm` (đi kèm Node.js) hoặc `yarn` / `pnpm`.

### Các bước cài đặt & Khởi chạy

1. **Cài đặt các phụ thuộc (Dependencies)**:

   ```bash
   npm install
   ```

2. **Chạy ứng dụng ở chế độ phát triển (Development Mode)**:

   ```bash
   npm run dev
   ```

   Sau khi khởi chạy thành công, truy cập ứng dụng tại địa chỉ cục bộ được cung cấp bởi Vite (mặc định: `http://localhost:5173`).

3. **Kiểm tra cú pháp & Code Style (Linting)**:

   ```bash
   npm run lint
   ```

4. **Biên dịch ứng dụng cho Production (Build)**:

   ```bash
   npm run build
   ```

5. **Xem trước bản build Production (Preview)**:
   ```bash
   npm run preview
   ```
