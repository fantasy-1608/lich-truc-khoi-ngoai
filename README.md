# Lịch trực khối Ngoại

## 🚀 Lệnh Nhanh

- **Chạy chương trình:** `npm run dev`
- **Tắt chương trình:** Nhấn `Ctrl + C` trong cửa sổ lệnh.

---

Đây là tài liệu kỹ thuật cho ứng dụng Lịch Trực Khối Ngoại, giúp cho việc bảo trì, sửa lỗi và phát triển các tính năng mới trong tương lai.

### 1. Mục Đích Ứng Dụng

Ứng dụng này được thiết kế để tự động hóa và đơn giản hóa việc tạo và quản lý lịch trực luân phiên (4 tua) cho các bác sĩ trong khoa. Nó cho phép:

- Hiển thị lịch trực theo tháng.
- Tùy chỉnh linh hoạt: hoán đổi ca trực, thay đổi bác sĩ trong một ngày cụ thể.
- Quản lý danh sách bác sĩ và thứ tự tua trực.
- Theo dõi và phân công các hoạt động khác của khoa (Ứng trực, PKĐK, PKDV).
- Xuất lịch ra file PDF và iCalendar (.ics) để dễ dàng đồng bộ và chia sẻ.

### 2. Cấu Trúc Thư Mục

Dự án đã được tái cấu trúc theo hướng module hóa để tăng tính rõ ràng và dễ bảo trì.

```text
/
├── index.html              # File HTML gốc
├── index.tsx               # Điểm bắt đầu của ứng dụng React
├── App.tsx                 # Component gốc, điều hướng các view chính
├── types.ts                # Định nghĩa các kiểu dữ liệu TypeScript chung
├── constants.ts            # Chứa các hằng số (ngày bắt đầu, dữ liệu khởi tạo)
├── data/                   # Thư mục lưu trữ dữ liệu JSON (được đồng bộ qua API)
├── hooks/                  # Chứa các custom hooks để tách biệt logic
│   ├── useScheduleData.ts  # Logic chính: quản lý state, persistence (JSON/API)
│   ├── useCalendarGrid.ts  # Logic tạo lưới lịch cho view "Khối Ngoại"
│   ├── useDepartmentCalendarGrid.ts # Logic tạo lưới lịch cho "Hoạt Động Khoa"
│   ├── useHolidayCalendarGrid.ts # Logic tạo lưới lịch cho "Lịch Lễ Tết"
├── utils/                  # Chứa các hàm tiện ích
│   └── export.ts           # Logic xuất file PDF và iCal
├── components/             # Chứa tất cả các UI components
│   ├── layout/             # Components layout chung (Header)
│   ├── icons/              # Các component icon SVG
│   ├── schedule/           # Components cho view "Lịch Khối Ngoại"
│   │   ├── ScheduleView.tsx
│   │   ├── ScheduleHeader.tsx
│   │   └── ...
│   ├── department/         # Components cho view "Hoạt Động Khoa"
│   │   ├── DepartmentScheduleView.tsx
│   │   └── ...
│   └── settings/           # Components cho màn hình "Cài Đặt"
│       ├── SettingsView.tsx
│       └── ...
└── README.md               # Tài liệu này
```

### 3. Quản Lý State và Luồng Dữ Liệu

**Trái tim của ứng dụng là hook `useScheduleData.ts`.**

- **Nguồn Dữ Liệu Duy Nhất (Single Source of Truth):** Hook này quản lý toàn bộ state của ứng dụng: danh sách tua, thứ tự tua, các thay đổi (overrides), danh sách bác sĩ, cài đặt hiển thị, v.v.
- **Persistence thông minh (JSON Storage):** Ứng dụng không còn sử dụng localStorage mà chuyển sang hệ thống lưu trữ tệp JSON thông qua API cục bộ.
  - Dữ liệu cấu hình chung: `schedule_base.json`.
  - Dữ liệu lịch theo tháng: `schedule_YYYY_MM.json`.
- **Luồng Dữ Liệu:**
  1. `useScheduleData` được gọi trong `App.tsx`.
  2. `App.tsx` nhận về toàn bộ `state` và các `hàm xử lý` (handlers) từ hook.
  3. `App.tsx` hoạt động như một bộ điều phối, truyền `state` và `handlers` cần tiếp xuống các component con.
  4. Mọi thay đổi sẽ được **tự động lưu (auto-save)** sau 1 giây kể từ lần chỉnh sửa cuối cùng.

### 4. Các Cải Tiến Kỹ Thuật (Bản 1.2)

- **Vite 6 & React 19:** Sử dụng các công nghệ mới nhất để tối ưu hiệu năng render.
- **Phân mảnh dữ liệu:** Lưu lịch theo từng tháng riêng biệt giúp ứng dụng chạy nhanh hơn khi dữ liệu lớn dần theo thời gian.
- **Logic Lễ Tết Động (5-tour rotation):** Tự động chuyển đổi từ quy trình 4 tua sang 5 tua trong những ngày lễ và quay lại trạng thái cũ sau lễ mà không làm xáo trộn vòng lặp gốc.
- **Automatic Navigation:** Luôn hiển thị tháng tiếp theo theo mặc định để giảm thao tác cho người dùng khi lập lịch.

### 5. Hướng Dẫn Bảo Trì & Nâng Cấp

Để đảm bảo dự án hoạt động ổn định khi nâng cấp sau này:

1. **Kháng Lỗi Ngày Tháng:** Luôn sử dụng `new Date(year, month, day)` để tránh lỗi lệch múi giờ (timezone offset) so với `new Date("YYYY-MM-DD")`.
2. **Persistence:** Khi thêm field mới vào state, hãy đảm bảo cập nhật `DEFAULT_DATA` và logic merge trong `useEffect` load dữ liệu.
3. **Thứ tự Tours:** Logic tính toán tua dựa trên `START_DATE` trong `constants.ts`. Nếu cần reset toàn bộ lịch từ một thời điểm mới, hãy sử dụng tính năng "Đặt ngày bắt đầu quy trình" trong phần Cài đặt thay vì sửa code.
4. **Backup:** Thư mục `data/` chứa toàn bộ dữ liệu người dùng. Hãy backup thư mục này thường xuyên.

#### A. Sửa một lỗi hiển thị trên Lịch Khối Ngoại

1. **Xác định vị trí:** Lỗi liên quan đến việc hiển thị một ô ngày.
2. **Tìm component:** Mở file `components/schedule/ScheduleDayCell.tsx`. Đây là component chịu trách nhiệm render một ô ngày.
3. **Kiểm tra props:** Xem các `props` được truyền vào từ `ScheduleView.tsx`. Dữ liệu hiển thị (`day`) được tính toán từ đâu?
4. **Truy vết logic:** Dữ liệu `calendarGrid` được tạo ra từ hook `hooks/useCalendarGrid.ts`. Hầu hết các lỗi logic về ngày tháng, tua trực sẽ nằm ở đây.
5. **Sửa lỗi:** Chỉnh sửa logic trong `useCalendarGrid.ts` hoặc logic hiển thị trong `ScheduleDayCell.tsx`.

#### B. Thêm một tùy chọn mới trong Cài Đặt

1. **Thêm State:** Mở `hooks/useScheduleData.ts`. Thêm một `useState` mới để lưu giá trị của tùy chọn. Đừng quên thêm `useEffect` để lưu nó vào `localStorage`.
2. **Thêm Handler:** Vẫn trong `useScheduleData.ts`, tạo một hàm (handler) để cập nhật state mới này. Trả về cả state và handler trong object cuối cùng.
3. **Tạo UI Component:**
    - Tạo một component mới trong `components/settings/`, ví dụ: `NewSetting.tsx`.
    - Component này nhận `state` và `handler` mới làm props và render ra UI (ví dụ: một switch, một input).
4. **Tích hợp vào SettingsView:** Mở `components/settings/SettingsView.tsx` và thêm component `NewSetting.tsx` vào.
5. **Truyền props:**
    - Mở `App.tsx`, lấy `state` và `handler` mới từ `useScheduleData`.
    - Truyền chúng xuống cho `SettingsView`.
    - `SettingsView` sẽ truyền tiếp xuống `NewSetting.tsx`.
6. **Sử dụng tùy chọn:** Ở nơi cần áp dụng tùy chọn mới (ví dụ: trong `ScheduleView`), hãy lấy giá trị state của nó từ `App.tsx` và sử dụng để điều khiển logic hoặc hiển thị.
