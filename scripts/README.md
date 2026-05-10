# Hướng dẫn Xuất Dữ liệu từ localStorage

## Cách sử dụng nhanh

### Bước 1: Xem hướng dẫn

```bash
pnpm run export-help
```

### Bước 2: Lấy dữ liệu từ trình duyệt

1. Mở ứng dụng trong trình duyệt
2. Nhấn **F12** để mở DevTools
3. Chuyển sang tab **Console**
4. Chạy lệnh sau:

```javascript
copy(JSON.stringify(localStorage));
```

5. Dữ liệu đã được copy vào clipboard!

### Bước 3: Xuất dữ liệu

```bash
pnpm run export-data
```

Sau đó paste dữ liệu vừa copy và nhấn Enter.

## Kết quả

Dữ liệu sẽ được lưu vào: `data/backup.json`

File này chứa:

- Danh sách bác sĩ
- Danh sách tua trực
- Thứ tự tua
- Các thay đổi lịch trực
- Cài đặt hiển thị

## Khôi phục dữ liệu

Để khôi phục dữ liệu, sử dụng chức năng "Nhập file" trong phần Cài đặt của ứng dụng.
