# IMAGE ASSET POLICY

## Quy tắc bắt buộc

- Ảnh mới được upload để sử dụng trên website PHAN THUẦN XTRA phải được chuyển sang **WebP** trước khi được tham chiếu trong HTML/CSS/JavaScript.
- Không đưa PNG/JPEG/JPG mới vào luồng production nếu ảnh đó có thể phân phối bằng WebP mà không làm mất yêu cầu chức năng.
- Giữ tỷ lệ ảnh gốc, khai báo đúng `width` và `height`, và tối ưu dung lượng trước khi deploy.
- Tên file production dùng tên mô tả, ổn định/immutable; khi thay nội dung ảnh phải dùng tên asset mới hoặc cơ chế cache-safe phù hợp.
- Sau khi WebP thay thế hoàn toàn ảnh cũ, xóa bản JPG/PNG trùng lặp khi đã xác nhận không còn tham chiếu cần thiết.
- Mọi thay đổi ảnh production phải qua CI/release gate và deploy verification hiện có; không đánh dấu GREEN nếu asset hoặc trang production chưa qua gate.

## Founder portrait hiện hành

Trang `/phan-thuan` sử dụng:

`/images/phan-thuan-founder-office-2026.webp`

Bản `phan-thuan-founder-office-2026.jpg` là asset cũ đã được WebP thay thế và phải được loại khỏi repository.

## Legacy assets

Các JPG cũ khác chỉ được chuyển/xóa sau khi xác định chính xác nơi sử dụng để tránh làm hỏng URL hoặc dữ liệu đang tham chiếu. Khi có yêu cầu thay ảnh hoặc upload ảnh mới, định dạng đích mặc định là **WebP**.
