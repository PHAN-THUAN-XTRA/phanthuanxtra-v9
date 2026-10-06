# Phan Thuần Xtra Free Security Operator

## Mục tiêu
Agent giám sát free-first chạy mỗi 15 phút và báo owner qua Telegram khi phát hiện sự cố vận hành hoặc tín hiệu tấn công.

## Tự động được phép
- Retry probe trước khi kết luận sự cố.
- Đọc Cloudflare Analytics/Security Events.
- Ghi trạng thái incident/dedupe vào D1.
- Gửi cảnh báo và thông báo hồi phục tới Telegram owner đã xác minh.
- Tận dụng self-heal hiện có của Worker cho Telegram webhook và durable queue recovery.

## Luôn cần owner phê duyệt
- Rollback production hoặc thay đổi commit.
- Bật Cloudflare Under Attack Mode.
- Thêm/sửa WAF/firewall block rule.
- Nâng cấp gói trả phí hoặc phát sinh chi phí.
- Xóa dữ liệu, rotate secret, khóa tài khoản hoặc thay đổi quyền.

## Nguyên tắc
Không dùng OpenAI API/Workers AI để agent sống được. AI có thể bổ sung sau nhưng không là dependency vận hành. Mọi cảnh báo phải dựa trên bằng chứng đo được và chống gửi trùng bằng D1.
