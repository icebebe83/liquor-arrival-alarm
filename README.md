# Liquor Arrival Alarm

Cypress Craft와 Hi Proof의 New Arrivals 컬렉션을 확인하고 새 상품을 텔레그램으로 알립니다.
상품 이미지가 있으면 텔레그램 사진 메시지에 상품명, 가격, 상태, 링크를 캡션으로 붙여 보냅니다.

중복 판단 데이터는 기본적으로 로컬 `data/products.json`에 저장합니다. `SUPABASE_URL`과
`SUPABASE_SERVICE_ROLE_KEY`가 있으면 Supabase Storage를 우선 사용합니다.

## Setup

1. Node.js 22.18 이상을 사용합니다.
2. 텔레그램 봇을 새 채팅방에 추가합니다.
3. 새 채팅방에 아무 메시지나 보낸 뒤 chat id를 확인합니다.

```bash
export TELEGRAM_BOT_TOKEN="123456789:replace_me"
npm run telegram:chats
```

4. `.env` 파일에 새 채팅방 chat id를 넣습니다.

```bash
TELEGRAM_BOT_TOKEN=123456789:replace_me
TELEGRAM_CHAT_ID=-1001234567890
SUPABASE_URL=https://xuwdubhwtfvpmsxdoefn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace_with_test_project_service_role_key
```

## Run

텔레그램 전송 없이 수집/비교만 확인:

```bash
npm run check
```

현재 상품 목록을 기준선으로 저장해서 첫 실제 실행 때 기존 상품 500개가 한꺼번에 오지 않게 하려면:

```bash
npm run baseline
```

실제 텔레그램 알림 전송:

```bash
npm start
```

## Schedule

매일 03:00, 04:00, 05:00, 06:00, 07:00, 08:00, 10:00, 11:00, 12:00에 자동 실행되도록 cron 스케줄을 설치합니다.

```bash
npm run schedule:install
```

해제:

```bash
npm run schedule:uninstall
```

로그는 `logs/cron.log`에 남습니다.
저장 파일은 기본적으로 `data/products.json`입니다.

## GitHub Actions

`.github/workflows/liquor-arrival-alarm.yml`은 GitHub Actions에서 실행됩니다.
스케줄은 GitHub 기준 UTC로 등록되어 있으며, 한국 시간으로 매일 03:00, 04:00, 05:00, 06:00, 07:00, 08:00, 10:00, 11:00, 12:00에 맞춰져 있습니다.

GitHub 저장소 Settings > Secrets and variables > Actions에 아래 secrets를 추가합니다.

```bash
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

현재 TEST Supabase 프로젝트:

```bash
SUPABASE_URL=https://xuwdubhwtfvpmsxdoefn.supabase.co
```

`SUPABASE_SERVICE_ROLE_KEY`는 TEST 프로젝트의 service_role key를 넣습니다. 이 값은 공개 저장소나 코드에 넣지 말고 GitHub Secret에만 저장합니다.

TEST 프로젝트의 service_role key 확인:

```bash
supabase projects api-keys --project-ref xuwdubhwtfvpmsxdoefn -o json
```

GitHub Actions를 켠 뒤 로컬 cron까지 계속 켜두면 중복 알림 가능성이 있습니다. GitHub Actions로 전환하면 로컬 스케줄은 해제하는 편이 안전합니다.

```bash
npm run schedule:uninstall
```
