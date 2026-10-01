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
Ảnh cover mới qua Gemini tìm biển số, phủ kín các vùng tìm được, rồi kiểm tra lại trước khi lưu R2. Lỗi hoặc kết quả không chắc chắn sẽ chặn lưu ảnh. Cần GEMINI_API_KEY và GEMINI_MODEL trên Worker website; cấu hình Gateway riêng không tự cấp quyền cho Worker này. Xem docs/gemini-editorial-privacy.md. Album nhiều ảnh chưa hỗ trợ.

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

---

## SOP đăng xe mới qua Telegram — durable `/carfinish`

Luồng chuẩn production:

`/carnew → nội dung owner → album ảnh → /carfinish → /carpreview <Inbox> → /carpublish <Inbox>`

Đây là thao tác dữ liệu/vận hành bình thường. **Không tạo PR, không sửa source và không deploy lại Worker cho từng bài/xe.**

### Bước 1 — Mở session sạch

Gửi `/carnew` và chờ bot xác nhận session mới đã mở. Không trộn hai xe trong cùng session.

### Bước 2 — Gửi nội dung owner

Gửi copy đã duyệt, giữ nguyên xuống dòng, emoji, bullet và tiếng Việt UTF-8.

- Giá và ODO owner cung cấp là authoritative; AI không được tự thay.
- Không có ODO số thì không suy diễn từ “xe mới 100%”.
- Nếu có nhiều bản copy trong session, bảo đảm bản cuối là bản owner muốn dùng trước khi chốt.

### Bước 3 — Gửi ảnh

Gửi đầy đủ ảnh đúng xe, ưu tiên một album, rồi chờ Telegram upload xong. Không gửi lại album chỉ vì xử lý nền phản hồi chậm.

### Bước 4 — Chốt durable

Gửi `/carfinish` đúng một lần sau khi intake hoàn tất.

`/carfinish` checkpoint tập ảnh/nội dung đã chọn vào durable queue, đóng intake session và giao xử lý ảnh/draft cho processor bền vững. Kỳ vọng bot báo số ảnh duy nhất, nội dung owner được giữ nguyên và durable queue đã được xếp.

Nếu xử lý bị gián đoạn giữa gallery: **không gửi lại ảnh, không mở `/carnew` mới, không tạo PR**. Gửi lại `/carfinish` cho session vừa chốt để recovery các hàng còn `processing`/`failed`. Recovery phải tiếp tục cùng xe, không tạo vehicle mới.

### Bước 5 — Preview

Gửi `/carpreview <Inbox>` và kiểm tra: đúng xe/canonical draft; copy owner đủ đoạn và không mojibake; giá/ODO đúng; số ảnh đủ và không trùng; cover có chủ đích; gallery theo ngữ nghĩa (human/model phù hợp nếu có → front/front 3/4 → exterior → details → cockpit → seats/interior → cargo → còn lại); media path giữ `/`, không có `%2F` thay separator.

Preview chưa đúng thì không `/carpublish` và không republish để sửa. Chỉ mở issue/PR khi có bằng chứng lỗi source/contract dùng chung.

### Bước 6 — Publish

Sau khi preview đạt, gửi `/carpublish <Inbox>` đúng một lần. Nếu Telegram confirmation lỗi/mất kết nối, kiểm tra trạng thái/canonical URL trước khi thử lại; lỗi confirmation không tự động đồng nghĩa publish thất bại.

Sau publish, mở URL public và xác nhận HTTP 200, UTF-8 đúng, giá/ODO đúng, hero + gallery đủ ảnh và cùng canonical vehicle ID.

## Xử lý timeout/retry mà không mở PR

1. Không tạo lại bài/xe ngay khi timeout hoặc connection reset.
2. Blog: dùng `/posts`/Admin để kiểm tra request trước đã ghi hay chưa.
3. Publishing API/GPT: retry cùng `request_id`; không sinh ID mới chỉ vì timeout.
4. Vehicle session đã chốt: recovery bằng `/carfinish`; không gửi lại album.
5. Chỉ mở issue/PR khi lỗi tái hiện và có bằng chứng lỗi source dùng chung. Lỗi mạng tạm thời dùng retry/reconcile vận hành.

## Checklist trước mỗi lần đăng mới

- Worker production gần nhất deploy SUCCESS và publishing gates không có RED hiện hành.
- Dùng đúng `@phanthuanxtra_auto_bot` và chat được cấp quyền.
- Nội dung owner đã duyệt; giá/ODO không phải dữ liệu AI tự đoán.
- Ảnh thuộc đúng bài/xe và gửi đủ trước `/carfinish`.
- Không commit GitHub cho nội dung, ảnh hoặc retry của một bài/xe bình thường.

## Production checkpoint sau PR #660

PR #660 merge vào `main` tại `8ddc245edb7a78c3b7a792f7068901fcaa4f0e36`. Deploy Cloudflare Worker #1781 SUCCESS trên đúng merge SHA; public/Admin/editorial UTF-8 và R2 `GET 200 → DELETE 200 → GET 404` PASS. Blog CMS Production E2E #644 attempt 2 SUCCESS toàn chuỗi create → read → public UTF-8 → update → delete → 404.

Trạng thái chuẩn sau checkpoint này: bài/xe mới đi theo SOP trên; **không dùng vehicle-specific/article-specific PR như một bước đăng bài**.

