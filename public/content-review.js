/* Owner-only review UI shared by Admin and the Telegram Mini App. */
(() => {
  const stageLabels = { generate: 'Soạn nội dung', draft: 'Lưu nháp', schedule: 'Chuẩn bị lịch', done: 'Hoàn tất' };
  const statusLabels = { ready: 'Sẵn sàng tiếp tục', running: 'Đang xử lý', retry: 'Chờ thử lại', blocked: 'Cần xử lý', completed: 'Đã hoàn tất' };
  const errors = {
    MODEL_UNAVAILABLE: 'Mô hình chưa khả dụng hoặc quota chưa đủ. Cần kiểm tra trước khi chạy lại.', MODEL_TIMEOUT: 'Mô hình phản hồi quá chậm; lần gọi đã được tính vào giới hạn.',
    MODEL_BUDGET_EXHAUSTED: 'Đã hết giới hạn gọi mô hình. Cần kiểm tra quota và chờ ngân sách ngày tiếp theo.', MODEL_OUTPUT_INVALID: 'Nội dung trả về không đúng định dạng an toàn.',
    ATTEMPTS_EXHAUSTED: 'Đã hết số lần thử lại cho bước này.', CREDENTIAL_EXPIRED: 'Credential đã hết hạn; cần owner cấp lại đúng phạm vi.',
    ARTIFACT_CONFLICT: 'Nháp đã thay đổi; lịch cần được chuẩn bị lại.', ARTIFACT_STALE: 'Nháp hoặc lịch không còn hiệu lực.',
    CHECKPOINT_UNAVAILABLE: 'Chưa lưu được checkpoint; runner giữ giới hạn thử lại.', ARTIFACT_UNAVAILABLE: 'Chưa lưu được nháp hoặc lịch.',
    DRAFT_CHANGED: 'Nháp đã thay đổi. Tải lại rồi kiểm tra trước khi lưu.', REVIEW_STALE: 'Nháp đã thay đổi hoặc lịch hết hạn. Tải lại để xem trạng thái mới.',
    DRAFT_CHANGED_OR_REVIEWED: 'Nháp đã thay đổi hoặc quyết định đã được ghi nhận. Tải lại để đối chiếu.', REQUEST_CONFLICT: 'Mã thao tác đã được dùng cho nội dung khác.',
    REVIEW_UNAVAILABLE: 'Chưa hoàn tất thao tác. Có thể thử lại; hệ thống sẽ đối chiếu để tránh ghi trùng.', Unauthorized: 'Phiên đăng nhập đã hết hạn. Hãy mở lại từ Telegram hoặc đăng nhập Admin.',
    Forbidden: 'Tài khoản này không có quyền owner.', ARTICLE_INVALID: 'Kiểm tra tiêu đề, nội dung và độ dài các trường.', PIPELINE_INVALID: 'Pipeline cần 16–80 ký tự chữ, số, dấu gạch dưới hoặc gạch nối.'
  };
  const staleLabels = { deleted: 'Nháp đã xóa', not_private_draft: 'Bài không còn là nháp riêng tư', revision_changed: 'Nội dung đã thay đổi', schedule_passed: 'Giờ đề xuất đã qua' };
  const time = value => value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value.endsWith('Z') || value.includes('T') ? value : value.replace(' ', 'T') + 'Z')) : 'Chưa có';
  const node = (tag, text, cls = '') => { const n = document.createElement(tag); if (text != null) n.textContent = String(text); if (cls) n.className = cls; return n; };
  const message = error => errors[error.message] || 'Không hoàn tất. Hãy tải lại để đối chiếu trước khi thử lại.';
  window.PTXContentReview = {
    create({ root, api, base }) {
      root.classList.add('content-review');
      let busy = false, pipeline = '', cursor = null, currentKey = null;
      const pending = new Map();
      const heading = node('h2', 'Nội dung / Lịch đề xuất');
      const policy = node('p', '“Đã kiểm tra” chỉ ghi nhận review. Bài vẫn là nháp; lịch đề xuất không tự đăng. Publish là thao tác riêng của owner.', 'cr-policy cr-note');
      const status = node('div', '', 'cr-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const body = node('div'); root.append(heading, policy, status, body);
      function say(text, bad = false) { status.textContent = text; status.className = bad ? 'cr-status cr-error' : 'cr-status'; }
      function button(text, action, primary = false) {
        const b = node('button', text, primary ? 'cr-primary' : ''); b.type = 'button'; b.onclick = () => { if (!busy) action(); }; return b;
      }
      async function work(action) {
        if (busy) return; busy = true; root.setAttribute('aria-busy', 'true');
        const controls = [...root.querySelectorAll('button,input,textarea')].map(n => [n, n.disabled]); controls.forEach(([n]) => n.disabled = true);
        try { await action(); } catch (error) { say(message(error), true); }
        finally { busy = false; root.removeAttribute('aria-busy'); controls.forEach(([n, disabled]) => n.disabled = disabled); }
      }
      function tags(current) {
        const row = node('div');
        row.append(node('span', ({ draft: 'Nháp riêng tư', published: 'Đã đăng', archived: 'Đã lưu trữ' })[current.post_status] || 'Đã xóa', 'cr-tag'));
        if (current.stale) row.append(node('span', (current.stale_reasons || []).map(x => staleLabels[x] || x).join(' · '), 'cr-tag cr-warning'));
        if (current.review) row.append(node('span', current.review.decision === 'accepted' ? 'Đã kiểm tra' : 'Đã bỏ qua', 'cr-tag'));
        return row;
      }
      async function fetchList(append = false) {
        currentKey = null;
        const query = new URLSearchParams(); if (pipeline) query.set('pipeline_id', pipeline); if (append && cursor) query.set('cursor', cursor);
        const data = await api(base + (query.size ? '?' + query : ''));
        if (!append) {
          body.replaceChildren();
          body.append(node('p', data.live_enabled ? 'AI thật đã được cấu hình bật.' : 'AI thật đang tắt. Nháp và lịch đã chuẩn bị vẫn có thể review.', 'cr-note'));
          if (!data.fleet_enabled) body.append(node('p', 'Agent đang tạm dừng; owner vẫn có thể kiểm tra nháp.', 'cr-note'));
          body.append(node('p', `Lần gọi mô hình hôm nay (UTC): ${data.budget.calls}/${data.budget.limit}.`, 'cr-meta'));
          const filters = node('div', null, 'cr-filters'), label = node('label', 'Lọc theo pipeline (để trống xem tất cả)'), input = node('input'); input.value = pipeline; input.maxLength = 80; input.autocomplete = 'off'; input.dataset.testid = 'content-pipeline'; label.append(input);
          filters.append(label, button('Lọc', () => work(async () => { pipeline = input.value.trim(); cursor = null; await fetchList(); })), button('Tải lại', () => work(async () => { cursor = null; await fetchList(); })));
          body.append(filters, node('h3', 'Tiến trình runner — 20 lượt gần nhất'));
          for (const run of data.runs) {
            const card = node('article', null, 'cr-card');
            card.append(node('strong', stageLabels[run.stage] || run.stage), node('div', statusLabels[run.status] || run.status, 'cr-meta'), node('div', `${run.pipeline_id} · ${run.request_id}`, 'cr-meta'), node('div', `Lần gọi mô hình: ${run.generation_calls}/3 · cập nhật ${time(run.updated_at)}`, 'cr-meta'));
            if (run.error_code) card.append(node('p', errors[run.error_code] || 'Có lỗi cần đối chiếu trước khi chạy tiếp.', 'cr-warning'));
            body.append(card);
          }
          if (!data.runs.length) body.append(node('p', 'Chưa có lượt runner. Preview không tạo lượt chạy.', 'cr-note'));
          body.append(node('h3', 'Nháp chuẩn bị'), node('div', null, 'cr-drafts'));
        }
        const drafts = body.querySelector('.cr-drafts');
        for (const draft of data.drafts) {
          const card = node('article', null, 'cr-card'); card.dataset.testid = 'content-draft-card';
          card.append(node('h3', draft.title), tags(draft), node('div', draft.pipeline_id, 'cr-meta'));
          if (draft.latest_proposal) {
            card.append(node('p', `Lịch đề xuất: ${time(draft.latest_proposal.proposed_at)} (giờ Việt Nam)`, 'cr-meta'), tags(draft.latest_proposal));
          } else card.append(node('p', 'Chưa có lịch đề xuất.', 'cr-meta'));
          card.append(button('Xem / sửa nháp', () => work(() => fetchDetail(draft.request_key)), true)); drafts.append(card);
        }
        if (!append && !data.drafts.length) drafts.append(node('p', 'Chưa có nháp trong phạm vi này.', 'cr-note'));
        body.querySelector('[data-more]')?.remove(); cursor = data.next_cursor;
        if (cursor) { const more = button('Xem thêm nháp', () => work(() => fetchList(true))); more.dataset.more = 'true'; body.append(more); }
        say('Đã tải nội dung và tiến trình.');
      }
      async function mutation(path, method, payload, success) {
        const signature = JSON.stringify([path, method, payload]);
        if (!pending.has(signature)) pending.set(signature, 'owner-' + crypto.randomUUID());
        const requestId = pending.get(signature);
        try { await api(path, { method, body: JSON.stringify({ ...payload, request_id: requestId }) }); }
        catch (error) {
          // A missing response may follow a committed transaction. Reconcile before another write.
          const reconciliation = await api(base + '/drafts/' + currentKey).catch(() => null);
          if (!reconciliation?.history.some(h => h.request_id === requestId)) throw error;
        }
        pending.delete(signature); await fetchDetail(currentKey); say(success);
      }
      function decisionButtons(target, label) {
        const actions = node('div', null, 'cr-actions');
        const choose = decision => work(() => mutation(base + '/requests/' + target.request_key + '/decision', 'POST', { expected_revision: target.current_revision, decision }, decision === 'accepted' ? 'Đã ghi nhận kiểm tra. Bài vẫn riêng tư; chưa đặt lịch đăng.' : 'Đã ghi nhận bỏ qua.'));
        const yes = button('Đã kiểm tra ' + label, () => choose('accepted'), true), no = button('Bỏ qua ' + label, () => choose('dismissed'));
        yes.disabled = no.disabled = target.stale || !!target.review; actions.append(yes, no); return actions;
      }
      async function fetchDetail(key) {
        const data = await api(base + '/drafts/' + key); currentKey = key;
        body.replaceChildren(button('← Danh sách', () => work(() => fetchList())), button('Tải lại nháp', () => work(() => fetchDetail(key))));
        const draft = data.draft, p = draft.post;
        body.append(node('h3', draft.title), tags(draft), node('p', draft.pipeline_id, 'cr-meta'));
        if (p) {
          const preview = node('details'), summary = node('summary', 'Xem toàn bộ nội dung hiện tại'); preview.open = true;
          preview.append(summary, node('p', p.excerpt, 'cr-note'), node('div', p.content, 'cr-content')); body.append(preview);
          if (p.status === 'draft') {
            const editor = node('details'); editor.dataset.testid = 'content-editor'; editor.append(node('summary', 'Sửa nháp riêng tư'));
            const form = node('form'), grid = node('div', null, 'cr-grid'), fields = {};
            for (const [field, label, max] of [['title', 'Tiêu đề', 240], ['excerpt', 'Tóm tắt', 800], ['content', 'Nội dung', 100000], ['category', 'Chuyên mục', 100], ['tags', 'Tags (phân cách dấu phẩy)', 2430]]) {
              const l = node('label', label, field === 'content' || field === 'excerpt' ? 'cr-wide' : ''), input = node(['content', 'excerpt'].includes(field) ? 'textarea' : 'input');
              input.value = field === 'tags' ? (p.tags || []).join(', ') : p[field] || ''; input.maxLength = max; input.dataset.testid = 'content-edit-' + field; input.name = field; l.append(input); grid.append(l); fields[field] = input;
            }
            form.append(grid); const save = button('Lưu nháp riêng tư', () => form.requestSubmit(), true); save.type = 'submit';
            save.onclick = undefined; form.append(save, node('p', 'Sau khi sửa, lịch đề xuất cho phiên bản cũ sẽ hết hiệu lực và cần được chuẩn bị lại.', 'cr-note'));
            form.onsubmit = event => { event.preventDefault(); if (busy) return; work(() => mutation(base + '/drafts/' + key, 'PATCH', {
              expected_revision: draft.current_revision, title: fields.title.value, excerpt: fields.excerpt.value, content: fields.content.value, category: fields.category.value,
              tags: fields.tags.value.split(',').map(x => x.trim()).filter(Boolean)
            }, 'Đã lưu nháp riêng tư. Kiểm tra lại các lịch đề xuất.')); };
            editor.append(form); body.append(editor, decisionButtons(draft, 'nháp'));
          }
        }
        body.append(node('h3', 'Lịch đề xuất — giờ Việt Nam'));
        for (const proposal of data.proposals) {
          const card = node('article', null, 'cr-card'); card.dataset.testid = 'content-proposal';
          card.append(node('strong', time(proposal.proposed_at)), tags(proposal), decisionButtons(proposal, 'lịch')); body.append(card);
        }
        if (!data.proposals.length) body.append(node('p', 'Chưa có lịch đề xuất cho nháp hiện có.', 'cr-note'));
        body.append(node('h3', 'Lịch sử owner review'));
        for (const h of data.history) body.append(node('div', `${time(h.created_at)} · ${h.action === 'edit' ? 'Sửa nháp' : h.action === 'accepted' ? 'Đã kiểm tra' : 'Bỏ qua'} · ${h.actor}`, 'cr-history'));
        if (!data.history.length) body.append(node('p', 'Chưa có quyết định review.', 'cr-note'));
        say('Đã đối chiếu phiên bản nháp và lịch hiện tại.');
      }
      return { load: () => work(() => fetchList()) };
    }
  };
})();
