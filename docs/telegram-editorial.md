# Đăng bài qua @phanthuanxtra_auto_bot

Các lệnh dưới đây đăng lên Blog tại phanthuanxtra.com. Nội dung được giữ nguyên,
không cần Workers AI để soạn lại. Luồng xe và `/blog` một dòng kèm ảnh dùng AI
vẫn hoạt động như trước. `/blog` hoặc `/news` có tiêu đề và nội dung trên các dòng
riêng dùng luồng bài tổng quát mới, kể cả khi kèm ảnh.

## Đăng ngay, lưu nháp

Gửi tin nhắn hoặc một ảnh cover có chú thích:

```text
/post Tiêu đề bài viết
Nội dung đoạn đầu.

Nội dung đoạn tiếp theo.
```

Thay `/post` bằng `/draft` để lưu nháp. Bot trả mã bài. Dùng `/publish 12`
để xuất bản bản nháp số 12. `/publish` không đưa bài đã hẹn lên sớm.
Bài nháp không có URL công khai; có thể sửa nội dung trong Admin trước khi đăng.

Ảnh cover: một ảnh riêng, tối đa 10 MiB; chuyển WebP, bỏ metadata, lưu R2.
Ảnh bài tổng quát không qua AI nhận dạng xe hay tự che biển số. Hãy gửi bản ảnh
đã chuẩn bị phù hợp để công khai. Album nhiều ảnh chưa hỗ trợ trong luồng này.

## Hẹn giờ Việt Nam

```text
/schedule 2026-10-01 09:00
Tiêu đề bài viết
Nội dung bài viết.
```

Ngày giờ luôn là giờ Việt Nam (UTC+07:00), định dạng YYYY-MM-DD HH:mm và phải
ở tương lai. Bài được công khai ở lượt cron đầu tiên sau giờ hẹn. Cron hiện chạy
mỗi 5 phút; không cam kết đúng từng giây. Khi cron bị gián đoạn, bài còn chờ được
xử lý ở lượt chạy lại; mỗi lượt tối đa 20 bài, ưu tiên giờ hẹn sớm nhất.

`/posts`: xem 20 bài gần nhất của chat cùng mã, trạng thái, giờ hẹn và link đã đăng.
`/cancel 12`: hủy bản nháp/lịch đang chờ; không xóa nội dung, không gỡ bài đã công khai.
Bài đã hủy không được mở lại bởi webhook lặp. Nếu cần hẹn lại, gửi yêu cầu mới.

## Nhiều bài trong một lần

Gửi tối đa 20 bài bằng tin nhắn:

```text
/batch
/post Tiêu đề thứ nhất
Nội dung thứ nhất.
---
/draft Tiêu đề thứ hai
Nội dung thứ hai.
---
/schedule 2026-10-02 10:00
Tiêu đề thứ ba
Nội dung thứ ba.
```

Hoặc đính kèm tệp UTF-8 `.txt` (cùng cú pháp, không cần dòng `/batch` trong tệp)
hoặc `.json`, tối đa 100 KiB, và đặt chú thích `/batch`. JSON mẫu:

```json
[
  {"title":"Bài một","content":"Nội dung một","mode":"draft","category":"Tin tức"},
  {"title":"Bài hai","content":"Nội dung hai","mode":"schedule","schedule":"2026-10-02 09:00"},
  {"title":"Bài ba","content":"Nội dung ba","mode":"publish","cover_image":"/media/blog/anh-da-luu.webp"}
]
```

JSON bỏ `mode` mặc định lưu nháp. Cover theo lô phải là đường dẫn `/media/` đã có
trên website. Nếu có bài không hợp lệ, toàn bộ lô không được lưu. Sau khi lưu,
từng bài được xử lý theo chế độ riêng. Bot trả báo cáo từng bài; `/posts` dùng
để kiểm tra khi nhận phản hồi lỗi hoặc mất kết nối.

## Vận hành và triển khai

- `TELEGRAM_AUTO_BOT_TOKEN` là token của @phanthuanxtra_auto_bot (có fallback cũ).
- Chat phải nằm trong `TELEGRAM_AUTO_PUBLISH_CHAT_IDS`, fallback `TELEGRAM_CHAT_ID`.
  Đây là quyền theo chat: thành viên chat được cấp quyền có thể dùng lệnh.
- Webhook `/api/telegram/webhook` phải có `TELEGRAM_WEBHOOK_SECRET` hợp lệ;
  không cấu hình secret thì các lệnh bài tổng quát trả 503 và không ghi dữ liệu.
- Deploy qua GitHub Actions → Cloudflare API/SDK; không dùng Wrangler.
- Controller tự áp dụng `0016_editorial_jobs.sql` và giữ cron `*/5 * * * *`.
- Bài nằm trong `posts`; `editorial_jobs` quản lý yêu cầu, chủ chat và giờ hẹn UTC.
- D1 batch giữ việc tạo bài, lịch, audit trong một giao dịch. Webhook lặp cùng
  chat/message_id không tạo lại bài. Gửi một tin nhắn mới là yêu cầu mới.
- Cron cập nhật bài và lịch trong một giao dịch; chạy trùng không đăng lại.
  Bài bị Admin lưu trữ hoặc xóa sẽ không bị cron phục hồi.
- Bot báo trạng thái từ D1 và URL chuẩn; đây không phải phép thử HTTP từ mạng ngoài.

## Kiểm chứng

```sh
node --test tests/editorial-publishing.test.mjs tests/auto-bot-ai.test.mjs
```

Kiểm thử dùng SQLite thật để kiểm tra rollback, cạnh tranh, trạng thái công khai,
chống trùng, hủy, giới hạn lô/tệp, giờ Việt Nam, ảnh WebP và quyền webhook.
Sau deploy cần thử trên bot thật: tạo nháp → /publish, hẹn giờ → chờ cron,
hủy một lịch, nhập lô hỗn hợp và mở link public. Chỉ đánh dấu production PASS
khi đã có bằng chứng những bước này, không suy từ PR merged hoặc unit tests.
