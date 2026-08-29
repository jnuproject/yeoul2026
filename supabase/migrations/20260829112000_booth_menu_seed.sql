insert into public.booth_menu_items (
  id,
  name,
  description,
  price,
  image_url,
  sold_out,
  active,
  sort_order
)
values
  ('b0010000-0000-4000-8000-000000000001', '감자치즈누룽지', '가격 확정 후 판매 시작', 0, null, false, false, 10),
  ('b0010000-0000-4000-8000-000000000002', '불닭볶음면', '가격 확정 후 판매 시작', 0, null, false, false, 20),
  ('b0010000-0000-4000-8000-000000000003', '불닭냉면', '가격 확정 후 판매 시작', 0, null, false, false, 30),
  ('b0010000-0000-4000-8000-000000000004', '레몬에이드', '가격 확정 후 판매 시작', 0, null, false, false, 40),
  ('b0010000-0000-4000-8000-000000000005', '청포도에이드', '가격 확정 후 판매 시작', 0, null, false, false, 50)
on conflict (id) do nothing;
