---
version: alpha
name: Surgical Roster Operations
description: Visual direction for the Lich truc khoi Ngoai scheduling app, optimized for dense monthly roster review and low-risk editing.
colors:
  background: '#EDF2F7'
  surface: '#FFFFFF'
  surface-subtle: '#E6EDF5'
  surface-inset: '#F7F9FC'
  surface-muted: '#E8EEF5'
  surface-raised: '#FFFFFF'
  border: '#C2CEDC'
  border-strong: '#8FA1B8'
  text: '#111827'
  text-muted: '#42526A'
  text-subtle: '#4B5563'
  primary: '#0F766E'
  primary-hover: '#115E59'
  on-primary: '#FFFFFF'
  primary-soft: '#CCFBF1'
  on-primary-soft: '#134E4A'
  accent: '#2563EB'
  accent-soft: '#DBEAFE'
  on-accent-soft: '#1E3A8A'
  selection: '#4338CA'
  selection-soft: '#E0E7FF'
  on-selection-soft: '#312E81'
  success: '#047857'
  success-soft: '#D1FAE5'
  warning: '#B45309'
  warning-soft: '#FEF3C7'
  modified: '#C2410C'
  modified-soft: '#FFEDD5'
  holiday: '#BE123C'
  holiday-soft: '#FFE4E6'
  danger: '#B91C1C'
  danger-soft: '#FEE2E2'
  role-main: '#F4F7FB'
  role-main-border: '#D7E0EB'
  role-green: '#E8F8F0'
  role-green-border: '#93D9B9'
  role-blue: '#E7F3FB'
  role-blue-border: '#8CCAF0'
  role-violet: '#F0ECFF'
  role-violet-border: '#B9A7FF'
  dark-background: '#0B1220'
  dark-surface: '#142034'
  dark-surface-subtle: '#0F1A2C'
  dark-border: '#45566D'
  dark-text: '#F8FAFC'
  dark-text-muted: '#D3DCE8'
typography:
  display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: 0
  headline:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 700
    lineHeight: 30px
    letterSpacing: 0
  title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 650
    lineHeight: 26px
    letterSpacing: 0
  body:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0
  body-strong:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 650
    lineHeight: 22px
    letterSpacing: 0
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0
  label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 650
    lineHeight: 18px
    letterSpacing: 0
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 650
    lineHeight: 16px
    letterSpacing: 0
  calendar-number:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 700
    lineHeight: 18px
    letterSpacing: 0
    fontFeature: "'tnum' 1, 'cv11' 1"
rounded:
  none: 0px
  xs: 3px
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  page-gutter: 24px
  calendar-gap: 6px
  cell-padding: 8px
components:
  app-shell:
    backgroundColor: '{colors.background}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
  top-bar:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    padding: '{spacing.md}'
  top-bar-tab-active:
    backgroundColor: '{colors.primary-soft}'
    textColor: '{colors.on-primary-soft}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: '{spacing.md}'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
    textColor: '{colors.on-primary}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text-muted}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: '{spacing.md}'
  button-danger:
    backgroundColor: '{colors.danger-soft}'
    textColor: '{colors.danger}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  calendar-cell:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  calendar-cell-muted:
    backgroundColor: '{colors.surface-subtle}'
    textColor: '{colors.text-subtle}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  role-card-main:
    backgroundColor: '{colors.role-main}'
    textColor: '{colors.text}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  role-card-green:
    backgroundColor: '{colors.role-green}'
    textColor: '{colors.success}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  role-card-blue:
    backgroundColor: '{colors.role-blue}'
    textColor: '{colors.accent}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  role-card-violet:
    backgroundColor: '{colors.role-violet}'
    textColor: '{colors.selection}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  calendar-cell-today:
    backgroundColor: '{colors.accent-soft}'
    textColor: '{colors.on-accent-soft}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  calendar-cell-selected:
    backgroundColor: '{colors.selection-soft}'
    textColor: '{colors.on-selection-soft}'
    rounded: '{rounded.sm}'
    padding: '{spacing.sm}'
  status-chip:
    backgroundColor: '{colors.surface-subtle}'
    textColor: '{colors.text-muted}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs}'
  status-chip-success:
    backgroundColor: '{colors.success-soft}'
    textColor: '{colors.success}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs}'
  status-chip-warning:
    backgroundColor: '{colors.warning-soft}'
    textColor: '{colors.warning}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs}'
  status-chip-modified:
    backgroundColor: '{colors.modified-soft}'
    textColor: '{colors.modified}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs}'
  status-chip-holiday:
    backgroundColor: '{colors.holiday-soft}'
    textColor: '{colors.holiday}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs}'
  status-chip-danger:
    backgroundColor: '{colors.danger-soft}'
    textColor: '{colors.danger}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs}'
  modal-panel:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.text}'
    rounded: '{rounded.lg}'
    padding: '{spacing.xl}'
---

## Overview

Ứng dụng này là công cụ vận hành lịch trực cho bác sĩ, không phải trang giới thiệu sản phẩm. Giao diện mới nên giống một bảng phân công trực được số hóa: rõ ngày, rõ tua, rõ bác sĩ, rõ trạng thái đã chỉnh/yêu cầu/lễ, và thao tác chỉnh sửa luôn có vị trí ổn định.

Phong cách hiện tại dùng nhiều indigo/violet, chữ gradient, lớp glass, blur, shadow và radius lớn. Hướng đó tạo cảm giác hiện đại nhưng chưa tối ưu cho việc quét bảng trực hằng ngày: nhiều hiệu ứng trang trí cạnh tranh với thông tin chính, màu tím/indigo đang vừa làm thương hiệu vừa làm trạng thái chọn, weekend, focus và CTA nên ý nghĩa thị giác bị pha lẫn.

Hướng đề xuất là **Operational Roster**: nền sáng trung tính, bảng có đường kẻ rõ, màu nhấn tiết chế, trạng thái có nghĩa cố định, typography dày vừa đủ để đọc tên bác sĩ trong ô nhỏ. Dark mode có thể giữ, nhưng phải là bản đảo tương phản của cùng một hệ thống, không phải một phong cách riêng.

## Colors

Bảng màu mới dùng neutral mát làm nền, teal làm hành động chính, blue cho điều hướng/phụ trợ, indigo chỉ cho trạng thái đang chọn, amber/orange cho thay đổi và yêu cầu, rose cho lễ hoặc cảnh báo lịch đặc biệt. Các lớp nền phải có tương phản đủ rõ giữa page, panel, grid, day cell và role card; không dùng các màu trắng/xám quá gần nhau cho tất cả bề mặt.

- **Neutral:** `background`, `surface`, `surface-subtle`, `surface-inset`, `border`, `text` là màu mặc định của toàn bộ app. Bảng lịch phải đọc được ngay cả khi không có màu nhấn.
- **Primary teal:** `primary` dùng cho hành động chính như hoàn tất, lưu, gửi yêu cầu, hoặc trạng thái sẵn sàng thực hiện. Không dùng teal để trang trí nền.
- **Accent blue:** `accent` dùng cho điều hướng tháng, liên kết phụ, focus ring và thông tin trung tính có thể thao tác.
- **Selection indigo:** `selection` chỉ dùng khi người dùng đã chọn bác sĩ/tua để hoán đổi. Không dùng làm màu thương hiệu chung.
- **Status colors:** `warning`, `modified`, `holiday`, `danger`, `success` có vai trò cố định. Không đổi ý nghĩa theo màn hình.

Các màu trạng thái nên xuất hiện dưới dạng chip, viền hoặc nền nhạt nhưng có border đủ rõ. Với các nhóm nghiệp vụ như `Ứng trực`, `PKĐK`, `PKDV`, dùng nền nhẹ cộng stripe trái 3px để tách nhóm mà không tô quá đậm toàn ô.

## Typography

Giữ **Inter** vì dự án đã tải font này và font đọc tiếng Việt tốt ở kích thước nhỏ. Không cần thêm font mới cho bản redesign đầu tiên.

- **Display/headline:** dùng cho tiêu đề tháng và tiêu đề màn hình cài đặt, không dùng hero-scale type.
- **Body:** 15px là kích thước mặc định cho nội dung chính; 13px dùng cho metadata, tên trong ô ngày, trạng thái nhỏ.
- **Labels:** dùng 12-13px semibold cho chip, tab, nút icon có text, nhãn thứ trong tuần.
- **Calendar numbers:** dùng tabular numerals để ngày tháng và số lượng yêu cầu không làm lệch bố cục.

Không dùng uppercase rộng cho nhiều nhãn trong bảng lịch. Chữ tiếng Việt cần ưu tiên độ đọc, không ưu tiên phong cách.

## Layout

Desktop nên là một workspace cố định: top bar nằm trên cùng, nội dung có max width rộng, bảng tháng là vùng chính. Header không nên nổi như glass card che nội dung; nên là thanh điều hướng trắng, viền rõ, sticky nhẹ nếu cần.

Bảng tháng là thành phần quan trọng nhất:

- Giữ lưới 7 cột, gap nhỏ 6px, ô ngày có chiều cao ổn định.
- Weekday header nên là hàng compact, nền `surface-subtle`, không cần chữ gradient hay tracking rộng.
- Ô ngày cần có vùng cố định cho số ngày, tua, danh sách bác sĩ, và hàng hành động/trạng thái.
- Trong màn Hoạt động khoa, `Trực chính`, `Ứng trực`, `PKĐK`, `PKDV` phải là các role cards tách biệt: nền riêng, border rõ, và stripe trái theo màu role.
- Các trạng thái nhỏ như đã chỉnh, lễ, yêu cầu chờ nên nằm cùng một vùng badge cố định để không làm tên bác sĩ nhảy vị trí.
- Mobile tiếp tục dùng mô hình tuần/ngày hiện có, nhưng giảm bo góc, giảm shadow, tăng phân tách bằng border và spacing.

Settings là màn hình quản trị dữ liệu, nên ưu tiên bố cục form/list rõ ràng thay vì card lớn nhiều blur. Grid 5/7 hiện tại hợp lý, nhưng card nên là `surface` + border, padding 24px, radius 8px.

## Elevation & Depth

Dùng **tonal layers và border**, không dùng glassmorphism làm ngôn ngữ chính. Shadow chỉ dùng cho modal, drawer và popover để tách khỏi nội dung nền.

- Page background: `background`.
- Main panels: `surface` với `border`.
- Nested rows/lists: `surface-subtle` hoặc border hairline.
- Modal/drawer/popover: shadow rõ nhưng ngắn, không blur nền quá mạnh.

Hover không nên scale ô lịch hoặc nút điều hướng. Với bảng dày thông tin, scale tạo cảm giác layout không ổn định. Dùng đổi nền, đổi viền hoặc underline/chip state.

## Shapes

Shape language nên gọn, chắc và nhất quán:

- Calendar cells, inputs, table rows, tabs: 4px hoặc 8px.
- Buttons: 4px cho nút chữ, full radius chỉ cho icon button nhỏ hoặc badge số lượng.
- Cards/panels: 8px.
- Modal/drawer: 12px tối đa vì cần tách lớp rõ hơn.

Không dùng `rounded-3xl` cho màn hình vận hành chính. Bo góc lớn làm app giống dashboard marketing hơn là công cụ phân công trực.

## Components

### Top Bar

Top bar chứa tên app, tabs chính, theme, khóa chỉnh sửa và cài đặt. Tên app nên là text thường màu `text`, không gradient. Tab active dùng nền `primary-soft` hoặc underline 2px, không cần slider animated lớn.

### Calendar Cell

Mỗi ô ngày cần có hierarchy cố định:

1. Góc trên: số ngày, trạng thái hôm nay/lễ/đã chỉnh/yêu cầu.
2. Dòng tua: chip nhỏ, màu theo `accent-soft` hoặc `selection-soft` khi đang chọn.
3. Danh sách bác sĩ: text 13px, line-height 18px, truncate có title/tooltip nếu cần.
4. Hành động: chỉ hiện rõ khi hover/focus trên desktop, nhưng vùng click không làm đổi kích thước ô.

Ngày ngoài tháng hoặc trước ngày bắt đầu dùng `calendar-cell-muted`, giảm tương phản nhưng vẫn giữ khung lưới để tháng không bị rỗng.

### Status Chips

Status chip phải có ngôn ngữ màu ổn định:

- `Hôm nay`: `accent` hoặc viền accent rõ.
- `Đã chỉnh`: `modified-soft` + `modified`, dùng icon đổi nhân sự dạng tròn nhỏ để không chiếm diện tích ô ngày. Không dùng chữ dài trong lưới tháng; giải thích bằng tooltip và `aria-label`.
- `Yêu cầu`: `warning-soft` + `warning`.
- `Lễ`: `holiday-soft` + `holiday`.
- `Đã xử lý`: `success-soft` + `success`.
- `Lỗi` hoặc thao tác bị chặn: `danger-soft` + `danger`.

Không dùng emoji cho trạng thái lịch chính; dùng text ngắn hoặc icon nhất quán.

### Edit States

Khi chưa mở khóa, các thao tác sửa nên hiện trạng thái disabled rõ hoặc ẩn khỏi ô lịch, nhưng các action xem/xuất vẫn giữ vị trí. Khi đã mở khóa, toolbar chỉnh sửa cần có một trạng thái thị giác rõ ở top bar để người dùng biết app đang ở chế độ có thể ghi dữ liệu.

### Requests Panel

Panel yêu cầu đổi/nghỉ trực nên đọc như work queue: filter chips ở trên, mỗi request là hàng hoặc card compact có ngày, người gửi, loại yêu cầu, trạng thái và hành động. Không dùng shadow cho từng request; dùng border và divider.

### Settings

Settings nên dùng section title nhỏ, form controls cao 40px, spacing 16-24px. Các nút nguy hiểm như xóa bác sĩ hoặc reset dữ liệu phải dùng màu danger và cần khoảng cách thị giác với nút lưu/hoàn tất.

## Do's and Don'ts

- Do ưu tiên khả năng quét bảng trực: ngày, tua, bác sĩ và trạng thái phải đọc được trong 1-2 giây.
- Do giữ màu trạng thái nhất quán giữa Khối ngoại, Hoạt động khoa, Lễ tết và Cài đặt.
- Do dùng border và nền nhạt để phân cấp thay cho blur, gradient và shadow lớn.
- Do đảm bảo WCAG AA cho text thường, đặc biệt text 12-13px trong chip và ô ngày.
- Do giữ vị trí action ổn định để hover/focus không làm nhảy layout.
- Don't dùng gradient cho tên app, heading, nút chính hoặc panel lịch.
- Don't dùng glass card/backdrop blur làm bề mặt mặc định.
- Don't dùng purple/indigo cho mọi thứ; indigo chỉ dành cho selection đang hoạt động.
- Don't scale ô lịch hoặc card khi hover.
- Don't dùng emoji làm ký hiệu trạng thái nghiệp vụ trong bảng lịch chính.
