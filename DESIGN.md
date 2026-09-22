---
version: alpha
name: Lich truc Operations Board
description: Quiet crew-operations system for dense Vietnamese surgical roster review and deliberate editing.
colors:
  background: '#F1F5F9'
  surface: '#FFFFFF'
  surface-subtle: '#F8FAFC'
  surface-inset: '#F1F5F9'
  border: '#CBD5E1'
  border-strong: '#64748B'
  ink: '#0F172A'
  ink-muted: '#334155'
  primary: '#0D9488'
  primary-hover: '#0F766E'
  primary-soft: '#CCFBF1'
  on-primary: '#FFFFFF'
  accent: '#2563EB'
  accent-soft: '#DBEAFE'
  warning: '#9A3412'
  warning-soft: '#FFEDD5'
  critical: '#BE123C'
  critical-soft: '#FFE4E6'
  dark-background: '#090D16'
  dark-surface: '#111827'
  dark-surface-cell: '#141E30'
  dark-border: '#334155'
  dark-border-strong: '#64748B'
  dark-ink: '#F8FAFC'
  dark-ink-muted: '#CBD5E1'
  dark-primary: '#14B8A6'
  dark-warning: '#FB923C'
  dark-critical: '#FB7185'
typography:
  display:
    fontFamily: Roster Sans
    fontSize: 28px
    fontWeight: 800
    lineHeight: 36px
    letterSpacing: -0.02em
  title:
    fontFamily: Roster Sans
    fontSize: 18px
    fontWeight: 800
    lineHeight: 24px
    letterSpacing: -0.02em
  body:
    fontFamily: Roster Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0
  body-compact:
    fontFamily: Roster Sans
    fontSize: 13px
    fontWeight: 600
    lineHeight: 18px
    letterSpacing: 0
  operational-label:
    fontFamily: Roster Sans
    fontSize: 12px
    fontWeight: 700
    lineHeight: 16px
    letterSpacing: 0
    fontFeature: "'tnum' 1"
rounded:
  none: 0px
  row: 4px
  control: 6px
  panel: 8px
  pill: 9999px
spacing:
  micro: 4px
  compact: 6px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  cell-padding: 8px
components:
  app-shell:
    backgroundColor: '{colors.background}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
  top-navigation:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '{spacing.sm}'
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.body-compact}'
    rounded: '{rounded.control}'
    padding: '{spacing.sm}'
  calendar-grid:
    backgroundColor: '{colors.border}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: 0px
  calendar-cell:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body-compact}'
    rounded: '{rounded.none}'
    padding: '{spacing.cell-padding}'
  doctor-row:
    backgroundColor: '{colors.surface-subtle}'
    textColor: '{colors.ink}'
    typography: '{typography.body-compact}'
    rounded: '{rounded.row}'
    padding: '{spacing.xs}'
  warning-counter:
    backgroundColor: '{colors.warning-soft}'
    textColor: '{colors.warning}'
    typography: '{typography.operational-label}'
    rounded: '{rounded.control}'
    padding: '{spacing.compact}'
  critical-counter:
    backgroundColor: '{colors.critical-soft}'
    textColor: '{colors.critical}'
    typography: '{typography.operational-label}'
    rounded: '{rounded.control}'
    padding: '{spacing.compact}'
  inspector:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '{spacing.md}'
  mobile-day-card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '{spacing.sm}'
---

## Overview

**Creative North Star: “Bảng điều hành kíp trực.”** Đây là bảng điều phối nhân lực y tế lấy cấu trúc từ trung tâm điều hành tổ bay: dày thông tin, có kỷ luật và đọc được trong một lần quét. Hướng đã chọn bắt nguồn từ direction seed `dd44f2e0` và được giao như một công cụ vận hành, không phải dashboard trình diễn.

Lịch là nội dung chính. Ngày, tua, bác sĩ, cảnh báo và trạng thái chỉnh sửa có vị trí ổn định; chế độ xem công khai luôn ưu tiên hơn chế độ biên tập hiếm dùng. Dark mode giữ nguyên cấu trúc và nghĩa màu.

Nhận diện chỉ dùng chữ “Lịch trực” và dấu `LT` dựng bằng HTML/CSS. Không có logo bệnh viện đã xác minh, ảnh raster hay tài sản thương hiệu bitmap.

## Colors

Hệ màu là **teal vận hành trên nền slate lạnh**. Bề mặt và đường kẻ gánh phần lớn phân cấp; màu chỉ xuất hiện khi có hành động hoặc trạng thái cần đọc.

- `ink`/`ink-muted` là chữ chính và metadata; các lớp slate tạo nền cùng đường kẻ liên tục.
- `primary` teal dùng cho brand mark, tab active, focus, mở khóa và doctor highlight; không dùng thành mảng trang trí lớn.
- `accent` blue dành cho liên kết và tương tác phụ.
- `warning` amber biểu thị “Mới ra trực”; `critical` rose biểu thị “Ra trực”, lịch lễ và cảnh báo mạnh hơn. Cả hai luôn đi kèm icon hoặc nhãn và không chặn nghiệp vụ.
- Dark mode dùng các token `dark-*` tương ứng, không đổi vai trò semantic.

## Typography

Toàn bộ giao diện dùng **Noto Sans tải cục bộ**, khai báo dưới alias CSS **`Roster Sans`**; `Inter` và `sans-serif` chỉ là fallback kỹ thuật. File regular phục vụ weight 400, file bold phục vụ weight 600–800.

- 22–28px dành cho tiêu đề màn hình hoặc dialog; không có hero type.
- Tiêu đề tháng là 18px/800; body là 15px/22px; roster data là 13px/18px.
- **12px/16px là operational text floor** cho nhãn thứ, counter, chip và metadata; không giảm dưới 12px.
- Ngày tháng và số lượng dùng tabular numerals. Uppercase chỉ dành cho kicker rất ngắn.

## Layout

Desktop là workspace toàn chiều rộng với header sticky mảnh, dải lệnh tháng và lịch 7 cột chiếm ưu thế. Lịch tháng là **một mặt phẳng có đường kẻ liên tục**: gap bằng 0, cell vuông góc, divider 1px và hierarchy cố định ngày → tua → bác sĩ → trạng thái/action.

- Từ `1280px`, workspace có inspector 19rem bên phải.
- Dưới `1280px`, inspector được ẩn; lịch có thể cuộn ngang với chiều rộng tối thiểu 980px thay vì ép tên bác sĩ.
- Khi schedule shell hẹp hơn 720px, UI chuyển sang week selector cuộn ngang, day selector và card chi tiết ngày; không thu nhỏ monthly grid.
- Mobile có bottom navigation cố định cho Khối ngoại, Hoạt động khoa và Lễ tết. Vùng chạm chính đạt 40–44px; mobile dọc ưu tiên xem và hiển thị trạng thái khóa sửa rõ ràng.

Khoảng cách theo nhịp 4/6/8/12/16/24px; settings và dialog thoáng hơn lưới lịch.

## Elevation & Depth

Thiết kế phẳng theo mặc định. Border, divider và tonal layer tạo cấu trúc; từng ô lịch không có shadow. Header và schedule shell chỉ có shadow rất nhẹ, shadow rõ hơn dành cho drawer, popover và modal. Không ghép border với shadow mạnh trên cùng bề mặt.

Hover đổi nền hoặc màu viền, không scale card hay ô ngày. Feedback ngắn khoảng 100–150ms và phải tôn trọng `prefers-reduced-motion`.

## Shapes

Hệ hình học có kiểm soát: **4px** cho doctor row và phần tử trong lưới, **6px** cho button/search/tab/counter, **8px** cho shell/panel/card mobile. Continuous calendar cell dùng `0px`. Pill chỉ dành cho status count hoặc avatar tròn, không dùng cho card và control thông thường.

## Components

### Header and Navigation

Header sticky là thanh trắng có divider. Brand mark `LT` là ô teal 32px radius 6px đi cùng chữ “Lịch trực”; đây là text/CSS mark, không phải raster logo. Tab desktop active bằng chữ teal và underline 3px. Mobile dùng bottom navigation cố định; theme, khóa sửa và settings giữ vị trí ổn định.

### Command Bar and Calendar

Dải lệnh gom điều hướng tháng, tìm bác sĩ, tổng hợp cảnh báo, thống kê và export. Control cao khoảng 40–42px, radius 6px; search focus dùng viền teal với halo mỏng.

Weekday row và day cells dùng chung rule 1px; grid không gap và cell không bo góc. Doctor row radius 4px trên nền slate nhạt. Doctor đang được tìm/hover dùng teal rõ và làm dịu các tên không liên quan. Hôm nay, lựa chọn, lịch đã chỉnh, lễ và yêu cầu phải có text/ARIA phù hợp, không chỉ màu.

### Doctor Inspector

Inspector chỉ xuất hiện từ 1280px, hiển thị initials, tổng ngày trực, chuỗi ngày trực và giải thích cảnh báo của bác sĩ đang hover, tìm hoặc chọn. Empty state hướng dẫn cách kích hoạt thay vì bịa dữ liệu nhân sự.

### Mobile Week and Day Cards

Mobile dùng week tabs cuộn ngang, day selector và card chi tiết ngày có tua, bác sĩ, cảnh báo, yêu cầu và hành động hợp lệ. Card dùng radius 8px; bottom navigation luôn nằm ngoài card để chuyển khu vực không phụ thuộc scroll.

### Edit, Requests and Secondary Surfaces

Mặc định là “Chỉ xem”. Khi mở khóa, control nói rõ “Đang chỉnh sửa” và dùng teal soft; action ghi dữ liệu chỉ xuất hiện khi quyền và viewport cho phép. Requests panel là work queue bằng row/divider. Hoạt động khoa, Lễ tết và Settings dùng chung border, typography, control radius 6px và panel radius 8px.

## Do's and Don'ts

- **Do** giữ lịch là phần tử lớn và dễ quét nhất trên mọi màn hình.
- **Do** dùng `Roster Sans`/Noto Sans cục bộ và giữ text floor 12px.
- **Do** giữ teal cho nhấn chính, rose cho “Ra trực”, amber cho “Mới ra trực”.
- **Do** dùng rule 1px, tonal layer, radius 4/6/8px, WCAG AA và focus-visible rõ.
- **Don't** đưa Inter trở lại làm font chủ đạo khi `Roster Sans` đã tải thành công.
- **Don't** tách calendar cell thành floating card hoặc tạo gap trong monthly grid.
- **Don't** hiển thị desktop inspector dưới 1280px hay ép monthly grid thành bản thu nhỏ trên mobile.
- **Don't** dùng glassmorphism, decorative gradient, oversized radius, hover scale hoặc shadow nặng.
- **Don't** thêm logo bệnh viện, ảnh raster, ảnh nhân sự hoặc metadata chưa được xác minh.
- **Don't** để cảnh báo mệt mỏi chặn nghiệp vụ vốn chỉ yêu cầu cảnh báo.
