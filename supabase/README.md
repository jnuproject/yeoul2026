# Supabase 연결 준비

대상 프로젝트: `vedraqrdkwyyipztxddw` (`jnuproject's Project`)

## 안전 원칙

- 기존 앱의 테이블, 함수, 정책은 수정하지 않습니다.
- 새 데이터베이스 객체는 모두 `booth_` 접두사를 사용합니다.
- 메뉴 사진은 `booth-menu-images` 버킷에만 저장합니다.
- Service Role 키는 브라우저 코드에 넣지 않습니다.
- 고객에게는 `booth_public_queue`의 주문번호와 상태만 공개합니다.

## 1. 프로젝트 연결

데이터베이스 비밀번호는 채팅이나 파일에 저장하지 말고 아래 명령의 보안 프롬프트에 직접 입력합니다.

```bash
cd /Users/goyehun/.kiro/crew/workspace/booth-order
supabase link --project-ref vedraqrdkwyyipztxddw
```

## 2. 적용 전 확인

```bash
supabase db push --dry-run
```

출력에는 아직 원격에 적용되지 않은 신규 마이그레이션만 보여야 합니다.

현재 적용 완료된 마이그레이션:

- `20260829110500_booth_order.sql`
- `20260829111000_booth_admin.sql`
- `20260829111500_booth_admin_switch.sql`
- `20260829112000_booth_menu_seed.sql`
- `20260829112500_booth_order_safety.sql`
- `20260829113000_booth_payment_account.sql`
- `20260829114000_booth_kakaopay_link.sql`

## 3. 마이그레이션 적용

```bash
supabase db push
```

## 4. 관리자 등록

먼저 Supabase Authentication에서 관리자 계정을 만든 뒤 SQL Editor에서 다음 SQL을 실행합니다.

```sql
insert into public.booth_admins (user_id)
select id from auth.users where email = '관리자 이메일';
```

## 5. 프런트엔드 연결

현재 고객·관리자 페이지는 `assets/supabase-store.js`를 사용합니다.

- 메뉴: `booth_menu_items`
- 주문 생성: `booth_create_order` RPC
- 내 주문 복구: `booth_get_order` RPC
- 공개 대기열: `booth_public_queue` + Realtime
- 관리자 주문 변경: `booth_orders`
- 메뉴 가격·판매·품절 변경: `booth_menu_items`
- 메뉴 이미지: `booth-menu-images`

관리자는 고정된 Gmail 계정으로 Auth 매직링크 로그인 후 `booth_is_admin()` 검사를 통과해야 데이터를 조회·변경할 수 있습니다. GitHub Pages 배포 후 `/admin/` 공개 주소를 Supabase Auth Redirect URL에 등록합니다.

## 현재 관리자

- 이메일: `k01027895490@gmail.com`
- 기존 Supabase Auth 사용자를 `booth_admins`에 등록 완료
- 이전 네이버 계정의 부스 관리자 권한은 제거 완료

## 현재 메뉴

아래 메뉴는 가격 `0`, `active = false`로 등록되어 고객에게 노출되거나 주문되지 않습니다. 실제 가격과 사진을 입력한 뒤 활성화합니다.

1. 감자치즈누룽지
2. 불닭볶음면
3. 불닭냉면
4. 레몬에이드
5. 청포도에이드
