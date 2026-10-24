---
version: alpha
name: Lich truc Studio
description: Expressive personal roster with a dominant monthly calendar, cobalt navigation and fluid contextual motion.
colors:
  background: '#EEF2F8'
  surface: '#FFFFFF'
  surface-subtle: '#F5F7FC'
  surface-inset: '#EDF1F7'
  border: '#DCE3EF'
  ink: '#17243E'
  ink-muted: '#465673'
  ink-subtle: '#596B85'
  primary: '#315BD4'
  primary-hover: '#2445AA'
  primary-soft: '#E7EDFF'
  on-primary: '#FFFFFF'
  warning: '#9A3412'
  warning-soft: '#FFEDD5'
  critical: '#BE123C'
  critical-soft: '#FFE4E6'
  dark-background: '#0D1321'
  dark-surface: '#151E30'
  dark-surface-subtle: '#1B273C'
  dark-surface-inset: '#111A2A'
  dark-border: '#33415B'
  dark-ink: '#EDF3FF'
  dark-ink-muted: '#C4D0E5'
  dark-ink-subtle: '#ABBAD3'
  dark-primary: '#A4BBFF'
  dark-primary-hover: '#C2D1FF'
  dark-primary-soft: '#243963'
typography:
  display:
    fontFamily: Roster Sans
    fontSize: 1.9rem
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: -0.035em
  title:
    fontFamily: Roster Sans
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.4
  heading:
    fontFamily: Roster Sans
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.4
  mobile-title:
    fontFamily: Roster Sans
    fontSize: 1.1rem
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: Roster Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Roster Sans
    fontSize: 0.9rem
    fontWeight: 700
    lineHeight: 1.4
  navigation:
    fontFamily: Roster Sans
    fontSize: 0.85rem
    fontWeight: 700
    lineHeight: 1.4
  compact:
    fontFamily: Roster Sans
    fontSize: 0.8rem
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Roster Sans
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
rounded:
  row: 7px
  badge: 8px
  button: 10px
  icon: 11px
  control: 12px
  mobile: 14px
  strip: 15px
  panel: 16px
  avatar: 18px
  shell: 20px
  full: 999px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.button}'
    padding: 12px
  personal-strip:
    backgroundColor: '{colors.primary-soft}'
    textColor: '{colors.ink}'
    rounded: '{rounded.strip}'
    padding: 16px
---

## Overview

Thiết kế lịch cá nhân có biểu cảm, ưu tiên xem nhanh toàn tháng và ca của mình. Brief mới ngày 24/10/2026 thay thế hướng quiet clinical cũ: đây là sản phẩm lịch, không áp dụng giới hạn thẩm mỹ của HIS. Các tên tab, nội dung thực và hành vi phân công được giữ nguyên.

## Colors

Cobalt dẫn đường cho tương tác. Bề mặt trắng trên nền sương; chế độ tối dùng nền than và cobalt sáng. Amber và rose chỉ biểu thị trạng thái cảnh báo hiện có. Luôn có nhãn kèm màu.

## Typography

Dùng Roster Sans (Noto Sans được lưu cục bộ), đầy đủ dấu tiếng Việt. Tiêu đề tháng lớn; số dùng tabular figures; nội dung lịch 12–15px. Không tải thêm font từ mạng.

## Layout

Thanh điều hướng gọn, tab trượt ở giữa. Thanh điều khiển tháng đứng trước khu vực Ca của tôi; lịch tháng là vùng chính. Desktop rộng có bảng thông tin bên phải; tablet ưu tiên lịch; điện thoại dùng tuần/ngày và điều hướng dưới. Ca của tôi cho phép chọn tên, ghi nhớ trên thiết bị, đánh dấu trong tháng, mở chi tiết và nhảy tới ca sắp tới trong tháng đang xem.

## Elevation & Depth

Khung lịch dùng bóng mềm 0 14px 44px -24px #213f7c40; không chồng nhiều lớp card. Kính mờ chỉ trên thanh điều hướng sticky, có nền gần đục để đọc rõ khi trình duyệt không hỗ trợ blur.

## Shapes

Khung 20px, panel 16px, control 10–12px; lưới tháng vẫn liền mạch để đọc ngày và hàng chính xác. Pill dành riêng cho tab và trạng thái ngắn.

## Components

- Lucian #039: tab pill với chuyển động 500ms cubic-bezier(.34,1.45,.64,1), chuyển sang React state và kích thước co giãn.
- Lucian #273: bảng ngữ cảnh dựa trên người đang được chọn; chuyển động vào 350ms, danh sách lấy từ lịch thật.
- Lucian #046: tìm nhanh bằng Cmd/Ctrl K, hỗ trợ tên không dấu, phím mũi tên, Enter và Esc. Native dialog giữ focus trong bảng lệnh và trả focus về nơi mở. Kết quả chạy công cụ thật, không ghi lịch khi tìm kiếm.
- Lucian #219: đổi theme bằng circular reveal 700ms từ nút giao diện qua View Transitions API; dùng một cây DOM, fallback đổi theme trực tiếp nếu thiếu API hoặc bật reduced motion.
- Lucian #004: xuất PDF có trạng thái busy và checkmark khi hàm xuất hoàn tất. Thanh chuyển động không giả phần trăm tiến độ. Lỗi giữ thông báo và cho phép thử lại, ngăn xuất trùng, dọn timer khi unmount.
- Lịch mini ở inspector: tháng bắt đầu thứ Hai, hiện mọi ngày trong tháng; chấm đỏ dưới ngày có ca, chú thích rõ ý nghĩa, viền ngày hôm nay và nền cobalt ngày được chọn. Bấm ngày đưa lịch lớn tới cùng ngày; hỗ trợ mũi tên, Home/End và Enter.
- Ca của tôi: chọn tên chỉ cập nhật localStorage hiện có. Highlight không chỉnh lịch, không ghi backend.
- Chuyển tháng: translateX 20px và opacity trong 300ms. Mỗi tháng có key riêng để phát lại animation khi chuyển liên tục.
- Hover/nhấn: 120–180ms. Tắt animation và transition khi prefers-reduced-motion.
- Giữ nguyên trạng thái loading, lỗi, không có dữ liệu, quyền xem/sửa và các luồng PDF/ICS hiện có.

## Do's and Don'ts

- Ưu tiên lịch tháng, sau đó là ca cá nhân; công cụ quản trị đứng sau.
- Giữ lịch sử, snapshot, thứ tự tua, phân công và quyền chỉnh sửa.
- Dùng dữ liệu thật để tính số ca; không thêm số liệu minh họa.
- Không tự động chuyển tab, chạy hiệu ứng lặp trên nội dung lịch hoặc cản thao tác để chờ animation.
- Không dùng tên hoặc nội dung giả làm thông tin thật.
- Push và deploy chỉ khi người dùng yêu cầu; luôn kiểm tra production sau khi phát hành.
