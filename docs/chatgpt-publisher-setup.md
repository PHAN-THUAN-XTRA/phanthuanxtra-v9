# PHAN THUẦN XTRA — GPT đăng bài

Tài khoản đích: tài khoản ChatGPT cá nhân được chủ dự án chỉ định trong phiên làm việc.
Không đưa địa chỉ tài khoản, mật khẩu hay khóa kết nối vào kho mã công khai.

## Điều kiện trước khi kết nối

1. PR được merge và Deploy Cloudflare Worker thành công, gồm phép thử
   `Verify publishing draft image public URL lifecycle`.
2. Trong Cloudflare Worker `phanthuanxtra-v2`, cấu hình secret `PUBLISH_API_KEY`
   là khóa ngẫu nhiên riêng (ít nhất 32 byte entropy). Không dùng ADMIN_PASSWORD,
   ADMIN_TOKEN hoặc CMS_API_KEY. Deployment hiện kế thừa binding trên Worker.
3. Đưa cùng khóa vào Authentication của GPT Action: API Key → Bearer.
   Nhập khóa trực tiếp vào hai giao diện bảo mật; không gửi khóa qua chat hay commit.
   Khi thu hồi, thay/xóa PUBLISH_API_KEY trên Worker.

Khóa này chỉ được truy cập API bài viết/ảnh mới. Không có quyền CRM, khách hàng,
xe, xóa dữ liệu hoặc Admin. Nó chỉ đọc/sửa/xuất bản các bài được tạo qua kết nối
GPT; Admin có thể quản lý mọi bài bằng phiên đăng nhập hiện có.

## Cấu hình GPT riêng

Tên: PHAN THUẦN XTRA — Đăng bài
Mô tả: Soạn bài tiếng Việt, lưu nháp kèm ảnh và xuất bản lên phanthuanxtra.com.
Chia sẻ: Only me / Chỉ mình tôi.

Trong Actions, nhập schema từ URL sau **sau khi deployment đã thành công**:

https://phanthuanxtra.com/openapi/publishing.json

Bản schema trong repo: `public/openapi/publishing.json`.

Instructions (dán nguyên khối nội dung dưới đây):

```text
Bạn là trợ lý biên tập PHAN THUẦN XTRA. Soạn bài tiếng Việt rõ ràng, đúng dấu,
chỉ dùng dữ kiện người dùng cung cấp hoặc nguồn đã kiểm chứng. Không tự bịa giá,
ODO, thông số xe, tình trạng hàng, thành tích hoặc thông tin pháp lý.

Khi người dùng yêu cầu lưu lên website, dùng createDraft với request_id UUID mới.
Giữ nguyên request_id khi thử lại cùng yêu cầu; không tạo ID mới do timeout.
Bài tạo ra luôn là bản nháp. Nếu người dùng chỉ nhờ viết nội dung, trình bày
bản thảo trước, không tự gửi dữ liệu sang website.

Nếu người dùng đã cung cấp/chọn ảnh để đăng, dùng uploadCover trước, truyền đúng
một ảnh qua openaiFileIdRefs. Dùng url /media/ trả về làm cover_image. Không dùng
link tải tạm, file ID, sandbox path hay link ChatGPT làm ảnh trên website.
Không tự cho rằng ảnh đã che biển số: luồng bài tổng quát chỉ chuyển WebP và bỏ
metadata. Nếu người dùng cần xử lý ảnh, hoàn tất và cho họ xem bản ảnh trước.

Trình bày tiêu đề, nội dung và ảnh để người dùng duyệt. Gọi readDraft trước khi
báo trạng thái. Chỉ gọi publishArticle khi người dùng yêu cầu xuất bản bản thảo
đó. Không tự xuất bản khi họ chỉ yêu cầu viết, lưu nháp hay sửa.

Khi xuất bản thành công, trả đúng public_url từ API. Chưa có phản hồi thành công
thì không nói đã đăng. Khi lỗi/timeout, đọc lại bài hoặc thử lại cùng request_id.
Không yêu cầu người dùng gửi mật khẩu hay API key trong cuộc trò chuyện.
Nếu hành động chưa được cấu hình hoặc API trả 401, nói rõ kết nối chưa sẵn sàng.
```

Gợi ý mở đầu:
- Viết bài từ thông tin và ảnh tôi gửi, rồi lưu nháp lên website.
- Đọc lại bài nháp số ... để tôi duyệt.
- Xuất bản bài nháp tôi vừa duyệt và gửi link.

## Phạm vi API

- POST `/api/publish/v1/media`: ảnh nhị phân (Admin) hoặc `openaiFileIdRefs` (GPT).
- POST `/api/publish/v1/posts`: tạo nháp, `request_id` bắt buộc và chống trùng.
- GET `/api/publish/v1/posts/{id}`: đọc trạng thái/nội dung thực tế.
- PUT `/api/publish/v1/posts/{id}`: sửa nháp; bài đã công khai trả 409.
- POST `/api/publish/v1/posts/{id}/publish`: xuất bản idempotent, trả public_url.

Ảnh tối đa 10 MiB, tải từ host OpenAI được cho phép và kiểm tra từng redirect.
Ảnh được chuyển WebP, bỏ metadata, lưu R2 trước khi dùng làm cover.

## Kiểm thử cần có

Backend CI: SQLite, quyền scoped, chống trùng, rollback, file download/redirect,
nháp không công khai, publish và bài công khai dùng đúng ảnh.

Production API: workflow đăng nhập Admin bằng secret hiện có, tải ảnh fixture,
lưu nháp, xác minh 404, thử lại không trùng, xuất bản, mở trang UTF-8 kèm ảnh,
rồi dọn đúng bài/ảnh tạm. Đây chưa phải bằng chứng GPT đã kết nối.

GPT thật: đăng nhập đúng tài khoản → tạo GPT riêng → import schema → cấu hình
khóa → gửi ảnh và nội dung → lưu nháp → duyệt → đăng → mở link. Ghi lại link GPT,
ID bài và URL website sau khi kiểm chứng. Nếu thiếu phiên đăng nhập hoặc khóa,
giữ trạng thái kết nối GPT BLOCKED; không tuyên bố hoàn thành toàn bộ.
