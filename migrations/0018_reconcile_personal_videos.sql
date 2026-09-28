-- Correct only the three confirmed legacy car-review URLs; keep old links via Worker redirects.
UPDATE posts SET slug='video-nha-phan-thuan',category='Người mẫu & Diễn viên',
  content='https://www.youtube.com/watch?v=khK5qPSDcB8',updated_at=CURRENT_TIMESTAMP
WHERE slug='video-review-xe-so-3-dinh-cao-trai-nghiem-automotive-concierge' AND title='Nhà'
  AND NOT EXISTS (SELECT 1 FROM posts WHERE slug='video-nha-phan-thuan');
UPDATE posts SET slug='video-giao-nhanh-ve-nha-phan-thuan',category='Người mẫu & Diễn viên',
  content='https://www.youtube.com/watch?v=KgfkNtlwRkg',updated_at=CURRENT_TIMESTAMP
WHERE slug='video-review-xe-so-2-chi-tiet-moi-goc-nhin' AND title='Giao nhanh về Nhà'
  AND NOT EXISTS (SELECT 1 FROM posts WHERE slug='video-giao-nhanh-ve-nha-phan-thuan');
UPDATE posts SET slug='video-buoc-toi-tet-moi-phan-thuan',category='Người mẫu & Diễn viên',
  content='https://www.youtube.com/watch?v=Dh0GtUR0zKY',updated_at=CURRENT_TIMESTAMP
WHERE slug='review-xe-phanthuanxtra-trai-nghiem-dang-cap-dau-tien' AND title='Bước tới tết mới cập nhật ngay'
  AND NOT EXISTS (SELECT 1 FROM posts WHERE slug='video-buoc-toi-tet-moi-phan-thuan');
