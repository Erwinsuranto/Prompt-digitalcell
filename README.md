Tiện ích ChatGPT Workspace Join Request

Đây là tiện ích mở rộng (Chrome Extension) được chuyển từ đoạn script trước đây chạy trong Chrome DevTools (F12 Console) sang chuẩn Chrome Manifest V3, giúp thao tác với ChatGPT Workspace dễ dàng hơn mà không cần dán mã mỗi lần.

Cài đặt

Mở Chrome và truy cập:

chrome://extensions/
Bật Chế độ nhà phát triển (Developer mode) ở góc trên bên phải.
Chọn Tải tiện ích đã giải nén (Load unpacked).

Chọn thư mục:

chatgpt-workspace-join-request-extension

Mở hoặc tải lại trang:

https://chatgpt.com/

Sau khi tải xong, một bảng điều khiển (Control Panel) sẽ xuất hiện ở góc trên bên phải.

Cách sử dụng
Nhóm chức năng Workspace
Request
Gửi yêu cầu tham gia Workspace bằng tài khoản ChatGPT đang đăng nhập.
Workspace sẽ được gửi tới theo Workspace ID đã cấu hình.
Accept
Chấp nhận lời mời tham gia Workspace nếu tài khoản đã được mời.
Nhóm chức năng tài khoản
Làm mới AT (Refresh AT)
Đọc lại Access Token từ phiên đăng nhập ChatGPT hiện tại.
Lấy ID (Get ID)
Hiển thị các thông tin của tài khoản đang đăng nhập:
Account ID
User ID
Email
Gói sử dụng (Plan)
Sao chép ID (Copy ID)
Sao chép toàn bộ thông tin ID đang hiển thị.
Rời Workspace (Leave Workspace)

Gọi API:

DELETE /backend-api/accounts/{account_id}/users/{user_id}
Để tài khoản hiện tại rời khỏi Workspace.
Khi bấm sẽ có hộp thoại xác nhận trước khi thực hiện.
Tự động gửi yêu cầu
Auto Request after Load
Khi bật tùy chọn này, mỗi lần tiện ích lấy được Access Token sau khi mở ChatGPT, nó sẽ tự động gửi yêu cầu tham gia Workspace.
Giao diện

Tiện ích gồm hai tab chính:

Workspace: các chức năng tham gia hoặc rời Workspace.
Account: xem thông tin tài khoản và Access Token.

Phía dưới luôn có khu vực Log, giúp theo dõi trạng thái và kết quả của các thao tác.

Thu gọn giao diện
Nút Thu gọn (Collapse) ở góc trên sẽ ẩn bảng điều khiển.

Sau khi ẩn, trên trang vẫn còn nút:

Open Workspace Tools

Nhấn vào để mở lại bảng điều khiển.

Ngoài ra, bạn cũng có thể nhấn vào biểu tượng tiện ích trên thanh công cụ Chrome để mở hoặc ẩn bảng điều khiển.

Cấu hình Workspace ID

Bạn có thể nhập nhiều Workspace ID theo các cách sau:

Mỗi dòng một ID.
Phân cách bằng dấu phẩy tiếng Anh ,.
Hoặc dấu phẩy tiếng Trung ，.

Mọi cấu hình sẽ được lưu trong bộ nhớ cục bộ (Chrome Local Storage) của trình duyệt và không được gửi tới bất kỳ dịch vụ bên thứ ba nào.

Lưu ý

Tiện ích chỉ hoạt động trên:

https://chatgpt.com/*

Tiện ích sẽ đọc thông tin đăng nhập hiện tại thông qua:

/api/auth/session

để lấy Access Token, sau đó sử dụng token này để gọi các API cùng miền (same-origin) của ChatGPT.

Khuyến nghị bảo mật:

Chỉ sử dụng tiện ích trên máy tính và trình duyệt mà bạn tin tưởng.
Chỉ dùng với tài khoản của chính bạn.
Không chia sẻ tiện ích hoặc mã nguồn nếu trong đó có chứa Workspace ID hoặc thông tin cá nhân của bạn.
