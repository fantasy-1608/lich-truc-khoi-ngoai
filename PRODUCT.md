# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Nhiều bác sĩ và nhân viên có thể mở ứng dụng để xem lịch trực trên máy tính hoặc điện thoại.
- Một người quản lý lịch giữ mật khẩu chỉnh sửa và thực hiện các thay đổi phân công.

## Product Purpose

Ứng dụng giúp mọi người xem nhanh lịch trực Khối ngoại, Hoạt động khoa và Lễ tết. Việc chỉnh sửa lịch diễn ra không thường xuyên, chủ yếu khoảng một lần mỗi tháng; vì vậy trải nghiệm xem lịch phải được ưu tiên hơn trải nghiệm biên tập.

Thành công nghĩa là người xem nhận ra ngay ngày trực, tua trực, bác sĩ liên quan và các cảnh báo quan trọng mà không cần học cách dùng giao diện.

## Positioning

Đây là lịch trực chuyên biệt cho quy trình của khối ngoại, kết hợp lịch trực chính, hoạt động khoa, lịch lễ và các cảnh báo phân công trên cùng một nguồn lịch. Ứng dụng phân tách rõ chế độ xem công khai với chế độ chỉnh sửa được bảo vệ bằng mật khẩu.

## Operating Context

- Người dùng thường mở lịch để tra cứu nhanh trên điện thoại hoặc máy tính.
- Người quản lý lập hoặc điều chỉnh lịch theo chu kỳ tháng.
- Lịch tháng có mật độ thông tin cao và cần hỗ trợ quét theo ngày, theo bác sĩ và theo trạng thái.
- Cảnh báo lịch chỉ hỗ trợ nhận biết rủi ro; chúng không chặn người quản lý thực hiện phân công.

## Capabilities and Constraints

- Giữ nguyên logic nghiệp vụ, dữ liệu và các luồng đang hoạt động ổn định trong quá trình đại tu giao diện.
- Hỗ trợ đầy đủ các tab Khối ngoại, Hoạt động khoa và Lễ tết, cùng các màn hình cài đặt, hộp thoại và trạng thái liên quan.
- Giao diện phải responsive và hữu dụng trên cả điện thoại lẫn máy tính.
- Chế độ xem là mặc định. Chỉ hiển thị khả năng chỉnh sửa sau khi người quản lý mở khóa bằng mật khẩu.
- Các cảnh báo như “Ra trực” và “Mới ra trực” chỉ cảnh báo, không ngăn lưu hoặc thay đổi lịch.

## Brand Commitments

- Tên sản phẩm hiển thị: “Lịch trực”.
- Ngôn ngữ giao diện chính: tiếng Việt rõ ràng, trực tiếp và thân thiện.
- Không biến sản phẩm thành dashboard trình diễn; đây là công cụ nghiệp vụ dùng thường xuyên.

## Evidence on Hand

- Ứng dụng React/Vite hiện tại là nguồn sự thật cho chức năng và nội dung.
- Dữ liệu lịch thực tế và các ảnh chụp màn hình hiện tại cung cấp các trường hợp điển hình về mật độ tên bác sĩ, trạng thái và cảnh báo.
- Chưa có bộ nhận diện thương hiệu hoặc tài sản hình ảnh riêng cần bảo tồn.

## Product Principles

1. Ưu tiên đọc và tra cứu lịch trước mọi thao tác quản trị.
2. Một màn hình phải cho người dùng hiểu lịch trong vài giây, không cần hướng dẫn.
3. Chế độ chỉnh sửa phải rõ ràng, có chủ ý và không làm giao diện xem trở nên phức tạp.
4. Cùng một trạng thái phải có cùng ngôn ngữ, màu sắc và hành vi trên mọi tab và thiết bị.
5. Đại tu hình thức nhưng không thay đổi logic nghiệp vụ đã ổn định.

## Accessibility & Inclusion

- Nội dung chính và trạng thái quan trọng phải đạt tương phản WCAG AA.
- Không truyền đạt cảnh báo chỉ bằng màu; luôn có nhãn hoặc biểu tượng kèm mô tả.
- Vùng chạm trên điện thoại phải đủ lớn và các thao tác chính phải sử dụng được bằng bàn phím.
