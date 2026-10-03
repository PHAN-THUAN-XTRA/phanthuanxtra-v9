# Nghiệm thu các hạng mục còn lại — PHAN THUẦN XTRA

Cập nhật 2026-10-03, Asia/Ho_Chi_Minh. Tài liệu này là quy trình nghiệm thu, không phải bằng chứng các bước thực tế đã được thực hiện. MASTER_PROJECT_STATUS.md là nguồn trạng thái chính.

## 1. S21 thật: Content Review và Customer Care

Dùng Telegram trên S21 và tài khoản owner đang sử dụng. Gửi `/customerapp`, mở Mini App.

- Tab **Nội dung**: xác nhận chữ tiếng Việt, các nút Lọc/Tải lại, thông báo AI đang tắt, hạn mức và khu vực tiến trình hiển thị đầy đủ; không bị header che hoặc cuộn ngang.
- Nếu không có nháp thật: ghi nhận màn hình rỗng hoạt động đúng; không coi đây là bằng chứng sửa/review một nháp. Khi có nháp riêng tư do owner chuẩn bị, mở chi tiết và kiểm tra nội dung, lịch đề xuất, thao tác review. **Đã kiểm tra** chỉ ghi nhận review, không đăng bài.
- Tab **Khách hàng**: mở hồ sơ khách hiện có; xác nhận trạng thái chăm sóc, Follow-up, ghi chú, AI đề xuất chăm sóc, lịch sử tương tác và audit.
- Nếu không có đề xuất đang chờ: ghi nhận trạng thái rỗng; cần một đề xuất thật để nghiệm thu nút Duyệt/Bỏ qua.
- Bấm **Xóa khách hàng** để quan sát hộp xác nhận, rồi **Hủy**. Không xác nhận xóa khách thật chỉ để làm kiểm thử.
- Quay lại danh sách, tải lại và xác nhận khách vẫn còn.

Bằng chứng cần lưu: thời điểm, model máy/phiên bản Telegram, màn hình hoặc video đã che tên/số điện thoại, từng bước PASS/FAIL/N/A. Không gửi initData, token hay thông tin đăng nhập. Chỉ đóng mục S21 khi có quan sát trên thiết bị thật; ảnh viewport CI vẫn là bằng chứng mô phỏng.

## 2. Một luồng Customer Care từ khách thật

Chọn một yêu cầu thật phát sinh qua kênh đang vận hành; không tạo khách/lead giả để đóng mục này.

1. Ghi nhận thời điểm và mã tham chiếu nội bộ của tương tác, khách và lead liên kết.
2. Mở đúng khách trong Mini App; xác nhận timeline Memory Brain phản ánh yêu cầu và không trộn khách khác.
3. Kiểm tra đề xuất chăm sóc từ tương tác đó. Nếu pipeline chưa tạo đề xuất hoặc quota chặn xử lý, ghi trạng thái chờ và nguyên nhân; không gán kết quả của khách khác.
4. Owner đọc lý do rồi Duyệt/Bỏ qua theo nhu cầu thật. Nếu cần follow-up, lưu thời điểm theo lịch đã trao đổi thật với khách.
5. Tải lại hồ sơ, xác nhận trạng thái, follow-up và audit phản ánh quyết định. Mỗi lần thử lại phải đối chiếu kết quả đã ghi trước khi tạo thao tác mới.
6. Khi follow-up thực sự diễn ra, ghi kết quả thật. Không tự gửi thông báo hoặc lời hứa cho khách chỉ để nghiệm thu.

Bằng chứng tối thiểu: tương tác nguồn → đúng khách/lead → timeline → đề xuất → quyết định owner → audit/lịch follow-up. Chỉ ghi mã tham chiếu và kết quả tổng hợp vào MASTER; nội dung riêng tư giữ trong hệ thống. Có đủ chứng cứ mới đóng mục E2E thật.

## 3. AI Content: quota, chạy thử có giới hạn và quyền publish

Production hiện giữ `CONTENT_RUNNER_LIVE_ENABLED=0`. Probe ghi nhận lúc **17:05:45 ngày 2026-10-03 (UTC+7)** trả HTTP 429 / Cloudflare 4006, hết free allocation 10.000 neurons. Đây là kết quả tại thời điểm probe, không phải cam kết quota đã hồi phục.

Điều kiện để triển khai bước tiếp theo:

- Probe mới xác nhận đúng tài khoản/credential và model phản hồi được; kết quả thiếu, timeout hoặc quota lỗi không được coi là PASS.
- Không tự nâng gói trả phí, thay ngân sách hoặc đổi nhà cung cấp.
- Chuẩn bị thay đổi cấu hình live runner trong PR riêng, giữ hạn mức **12 lượt/ngày UTC, 3 lượt/run, 1.200 output tokens, 25 giây**; CI và AI audit phải xanh trước deploy.
- Owner cấp hai credential khác nhau cho writer agent-11 và scheduler agent-19, cùng pipeline, thời hạn tối đa một giờ. Không đưa owner credential vào runner.
- Dùng brief từ nội dung owner đã xác nhận và lịch tương lai theo Asia/Ho_Chi_Minh; chạy một request_id ổn định. Mất phản hồi thì reconcile/resume cùng request_id; không sinh hàng loạt request mới.
- Kiểm chứng một nháp riêng tư, một đề xuất lịch, ledger/audit, số lượt provider và replay. Kết quả yêu cầu `publicPublish:false`, `autoPublish:false`, **0 pending publication jobs**.
- Owner review nội dung thực tế. Publish vẫn là thao tác owner riêng; bật AI không cấp quyền public publish cho agent.
- Nếu quota lỗi, output không hợp lệ hoặc vượt ngân sách: dừng run theo contract, giữ artifact riêng tư và đưa cấu hình live về 0 qua quy trình deploy. Không xóa ledger để thử lại.

Chỉ đóng mục live readiness khi có probe mới PASS và bằng chứng bounded provider/run phù hợp. Luồng offline PASS không thay thế bằng chứng model thật.

## 4. Giới hạn của bản backup đã gửi

Backup run **37114688475** đã gửi Telegram và Gate 14 **37114866763** đã phục hồi thử thành công. Phạm vi gồm source snapshot, D1 chính, R2 chính, sáu Worker và cấu hình đã che bí mật.

Các phạm vi chưa được backup dữ liệu trong bản này:

| Phạm vi | Việc cần làm trước khi tuyên bố đủ |
| --- | --- |
| D1 phụ luxury-ui-db, chatbot-db | Export SQL riêng, lưu evidence và phục hồi thử từng DB |
| R2 phụ ai-pt-xtra-apk, phanthuanxtra-images | Inventory/object count, lấy toàn bộ byte, checksum và kiểm tra restore |
| KV, Durable Object storage | Xác định binding/dữ liệu thực tế và thiết kế exporter phù hợp từng ứng dụng |
| Queue đang xử lý | Dùng checkpoint/reconciliation; không tuyên bố snapshot queue từ việc backlog=0 |
| Khóa bí mật | Quy trình khôi phục credential riêng ở nơi bảo mật; không chép vào Telegram hoặc repo công khai |

Audit 18:58 xác nhận tài nguyên và backlog hiện tại; audit không thay thế nội dung backup. Mọi mở rộng cần receipt và restore proof mới. Không gộp các giới hạn này vào nhãn “backup toàn bộ tài khoản Cloudflare đã xong”.
