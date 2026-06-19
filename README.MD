# Kollector

## English

### Description

Kollector is a full-stack collection-management platform for cataloging, processing, and maintaining collectible assets such as sneakers, LEGO sets, cameras, and other personal items. It combines a Node.js API, asynchronous AI image processing, a React web dashboard, and an Expo mobile app so users can upload asset photos, remove backgrounds, extract metadata, monitor processing in real time, customize asset presentation themes, and manage subscription-based quotas.

The repository is organized as a monorepo with separate applications for the API server, AI worker, web client, mobile client, deployment tooling, and product specifications.

### Features

- User authentication with access/refresh token flows.
- Asset library with categories, upload flow, detail pages, filters, pagination, retry support, and image state tracking.
- AI-assisted image pipeline for enhancement, background removal, and metadata extraction.
- Realtime processing updates through Socket.IO.
- Gamification for asset maintenance, including condition decay, cleaning actions, streaks, badges, and XP rewards.
- Subscription MVP with Free/VIP tiers, asset caps, monthly processing quotas, VIP theme access, 3x VIP maintenance XP, manual bank-transfer upgrade requests, and admin approval/rejection workflows.
- Admin dashboard for overview metrics, user lookup, subscription review, queue status, and failed job inspection.
- Web and mobile clients that share the same API contracts and subscription/quota semantics.
- Production deployment assets for Docker Compose, Nginx edge proxy, Oracle Ubuntu VM setup, health checks, model warmup, and GitHub Actions deployment.

### Tech Stack

| Area | Technologies |
| --- | --- |
| Backend API | Node.js 22, Express 5, CommonJS, Mongoose, JWT, Helmet, CORS, Winston |
| Queue / Realtime | Redis, BullMQ, Socket.IO |
| Database | MongoDB |
| AI Worker | Python 3.11, FastAPI, Uvicorn, Pillow, PyTorch, Transformers, RMBG-1.4, Moondream2 |
| Web | React 19, TypeScript, Vite 7, React Router 7, TanStack Query, React Hook Form, Zod, Tailwind CSS 4 |
| Mobile | Expo 54, React Native 0.81, React 19, React Navigation, Secure Store, Camera/Image Picker, EAS Build |
| Testing | Jest, Supertest, Vitest, Testing Library, Jest Expo, Pytest |
| Deployment | Docker, Docker Compose, Nginx, GitHub Actions, Oracle Ubuntu VM scripts |

### Installation / Setup

#### Prerequisites

- Node.js 22+
- npm
- Python 3.11 or 3.12 for the AI worker
- MongoDB
- Redis
- Optional: Docker and Docker Compose for production-like deployment
- Optional: Expo CLI / EAS CLI for mobile builds

#### Clone the Repository

```bash
git clone https://github.com/BossHoder/kollector.git
cd kollector
```

#### Backend API Setup

```bash
cd server
npm install
cp .env.example .env
```

Update `server/.env` as needed:

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
SOCKET_CORS_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/kollector
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
STORAGE_DRIVER=local
STORAGE_ROOT=./uploads
STORAGE_PUBLIC_BASE_URL=http://localhost:3000
```

#### AI Worker Setup

```bash
cd ai-worker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

On macOS/Linux, activate the environment with:

```bash
source .venv/bin/activate
```

The first AI run may download model weights into the configured Hugging Face/model cache directories.

#### Web App Setup

```bash
cd web
npm install
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3000`.

#### Mobile App Setup

```bash
cd mobile
npm install
cp .env.example .env
```

For physical devices, set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOCKET_URL` to your computer LAN IP or a public tunnel URL, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.5:3000/api
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.5:3000
```

### Usage / How to Run

Run MongoDB and Redis first, then start each application in a separate terminal.

#### 1. Start the AI Worker

```bash
cd ai-worker
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

#### 2. Start the Backend API

```bash
cd server
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

#### 3. Start the Web App

```bash
cd web
npm run dev
```

Open `http://localhost:5173`.

#### 4. Start the Mobile App

```bash
cd mobile
npm start
```

Then open the app with Expo Go, an emulator, or a development build.

#### Useful Commands

| Command | Location | Purpose |
| --- | --- | --- |
| `npm test` | `server/` | Run backend Jest tests |
| `npm run dev` | `server/` | Start API with Nodemon |
| `pytest` | `ai-worker/` | Run AI worker tests |
| `npm run dev` | `web/` | Start Vite web dev server |
| `npm run build` | `web/` | Build web production bundle |
| `npm run test:run` | `web/` | Run web tests once |
| `npm start` | `mobile/` | Start Expo dev server |
| `npm test` | `mobile/` | Run mobile Jest tests |
| `npm run build:android:preview` | `mobile/` | Build Android preview with EAS |

#### Production Deployment

Production deployment is defined by:

- `docker-compose.prod.yml`
- `deploy/oracle/README.md`
- `deploy/oracle/scripts/`
- `.github/workflows/deploy-prod.yml`

The production stack builds and runs:

- `web`
- `server`
- `ai-worker`
- `redis`
- `nginx` edge proxy

MongoDB is expected to be provided externally, for example by MongoDB Atlas. Production environment values are based on `deploy/oracle/.env.production.example`.

### Project Structure

```text
kollector/
|-- ai-worker/                 # FastAPI AI service for analysis, background removal, and image enhancement
|-- deploy/                    # Oracle VM deployment scripts, Nginx templates, production env example
|-- mobile/                    # Expo / React Native mobile app
|-- projects/                  # Supporting project artifacts
|-- scripts/                   # Repository-level helper scripts
|-- server/                    # Express API, MongoDB models, BullMQ workers, Socket.IO, tests
|   |-- src/
|   |   |-- common/             # Shared backend utilities
|   |   |-- config/             # Database, Redis, Socket.IO, storage, logging config
|   |   |-- contracts/          # OpenAPI contract registration
|   |   |-- middleware/         # Auth, admin, upload, validation, error middleware
|   |   |-- models/             # Mongoose models
|   |   |-- modules/            # Auth, assets, admin, gamification, subscription domains
|   |   `-- workers/            # AI, enhancement, decay, subscription maintenance workers
|   `-- tests/                 # Contract, integration, and unit tests
|-- specs/                     # Product specs, implementation plans, data models, contracts, quickstarts
|-- web/                       # React / TypeScript / Vite web dashboard
|   |-- src/
|   |   |-- components/         # Reusable UI and feature components
|   |   |-- contexts/           # Auth, socket, toast contexts
|   |   |-- hooks/              # Client-side data and realtime hooks
|   |   |-- lib/                # API clients, mappers, helpers
|   |   |-- pages/              # Public, authenticated, and admin pages
|   |   |-- types/              # Shared TypeScript types
|   |   `-- router.tsx          # React Router configuration
|   `-- tests/                 # Web unit and integration tests
|-- docker-compose.prod.yml    # Production Compose stack
|-- package-lock.json          # Root npm lock metadata
`-- README.MD                  # Project README
```

### Contributing

1. Create a feature branch from the current main branch.
2. Keep changes scoped to one feature or fix.
3. Follow the existing module boundaries in `server/`, `web/`, `mobile/`, and `ai-worker/`.
4. Add or update tests for behavior changes.
5. Run the relevant validation commands before opening a pull request:

```bash
cd server && npm test
cd ../web && npm run test:run && npm run build
cd ../mobile && npm test
cd ../ai-worker && pytest
```

6. Update related specs or quickstarts under `specs/` when product behavior or contracts change.

### License

No top-level license file is currently included in this repository. The backend package declares `ISC` in `server/package.json`, but repository-wide licensing should be confirmed before redistribution or public reuse.

### Contact / Author

- Repository: `https://github.com/BossHoder/kollector`
- Author / Maintainer: `theanhdola`
- Email observed in project scripts/history: `thetruong275@gmail.com`

---

## Tiếng Việt

### Mô Tả

Kollector là nền tảng full-stack để quản lý bộ sưu tập, giúp người dùng lưu trữ, xử lý và bảo trì các tài sản sưu tầm như sneaker, LEGO, máy ảnh và các vật phẩm cá nhân khác. Dự án kết hợp API Node.js, pipeline xử lý ảnh AI bất đồng bộ, dashboard web React và ứng dụng mobile Expo để người dùng tải ảnh tài sản, xóa nền, trích xuất metadata, theo dõi tiến trình realtime, tùy biến theme hiển thị và quản lý quota theo gói đăng ký.

Repository được tổ chức theo mô hình monorepo, tách riêng backend API, AI worker, web client, mobile client, công cụ triển khai và tài liệu đặc tả sản phẩm.

### Tính Năng

- Xác thực người dùng với access token và refresh token.
- Thư viện tài sản với danh mục, upload, trang chi tiết, bộ lọc, phân trang, retry và theo dõi trạng thái ảnh.
- Pipeline AI hỗ trợ tăng cường ảnh, xóa nền và trích xuất metadata.
- Cập nhật trạng thái xử lý realtime bằng Socket.IO.
- Gamification cho việc bảo trì tài sản, gồm giảm độ bền theo thời gian, thao tác làm sạch, streak, badge và XP.
- Subscription MVP với gói Free/VIP, giới hạn số tài sản, quota xử lý ảnh theo tháng, theme VIP, 3x XP bảo trì cho VIP, yêu cầu nâng cấp qua chuyển khoản ngân hàng và quy trình admin duyệt/từ chối.
- Dashboard admin cho số liệu tổng quan, tra cứu người dùng, duyệt subscription, trạng thái queue và kiểm tra job lỗi.
- Web và mobile dùng chung API contract cũng như logic subscription/quota nhất quán.
- Bộ triển khai production cho Docker Compose, Nginx edge proxy, Oracle Ubuntu VM, health check, warmup model và GitHub Actions.

### Công Nghệ Sử Dụng

| Khu vực | Công nghệ |
| --- | --- |
| Backend API | Node.js 22, Express 5, CommonJS, Mongoose, JWT, Helmet, CORS, Winston |
| Queue / Realtime | Redis, BullMQ, Socket.IO |
| Database | MongoDB |
| AI Worker | Python 3.11, FastAPI, Uvicorn, Pillow, PyTorch, Transformers, RMBG-1.4, Moondream2 |
| Web | React 19, TypeScript, Vite 7, React Router 7, TanStack Query, React Hook Form, Zod, Tailwind CSS 4 |
| Mobile | Expo 54, React Native 0.81, React 19, React Navigation, Secure Store, Camera/Image Picker, EAS Build |
| Testing | Jest, Supertest, Vitest, Testing Library, Jest Expo, Pytest |
| Triển khai | Docker, Docker Compose, Nginx, GitHub Actions, script Oracle Ubuntu VM |

### Cài Đặt / Thiết Lập

#### Yêu Cầu Trước Khi Cài

- Node.js 22+
- npm
- Python 3.11 hoặc 3.12 cho AI worker
- MongoDB
- Redis
- Tùy chọn: Docker và Docker Compose để chạy gần giống production
- Tùy chọn: Expo CLI / EAS CLI để build mobile

#### Clone Repository

```bash
git clone https://github.com/BossHoder/kollector.git
cd kollector
```

#### Thiết Lập Backend API

```bash
cd server
npm install
cp .env.example .env
```

Cập nhật `server/.env` nếu cần:

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
SOCKET_CORS_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/kollector
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
STORAGE_DRIVER=local
STORAGE_ROOT=./uploads
STORAGE_PUBLIC_BASE_URL=http://localhost:3000
```

#### Thiết Lập AI Worker

```bash
cd ai-worker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Trên macOS/Linux, kích hoạt môi trường bằng:

```bash
source .venv/bin/activate
```

Lần chạy AI đầu tiên có thể tải model weights vào các thư mục cache đã cấu hình.

#### Thiết Lập Web App

```bash
cd web
npm install
```

Vite dev server proxy `/api` và `/socket.io` về `http://localhost:3000`.

#### Thiết Lập Mobile App

```bash
cd mobile
npm install
cp .env.example .env
```

Nếu chạy trên thiết bị thật, đặt `EXPO_PUBLIC_API_URL` và `EXPO_PUBLIC_SOCKET_URL` thành LAN IP của máy tính hoặc URL tunnel public, ví dụ:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.5:3000/api
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.5:3000
```

### Cách Chạy

Chạy MongoDB và Redis trước, sau đó mở từng terminal riêng cho từng ứng dụng.

#### 1. Chạy AI Worker

```bash
cd ai-worker
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Kiểm tra health:

```bash
curl http://localhost:8000/health
```

#### 2. Chạy Backend API

```bash
cd server
npm run dev
```

Kiểm tra health:

```bash
curl http://localhost:3000/health
```

#### 3. Chạy Web App

```bash
cd web
npm run dev
```

Mở `http://localhost:5173`.

#### 4. Chạy Mobile App

```bash
cd mobile
npm start
```

Sau đó mở app bằng Expo Go, emulator hoặc development build.

#### Lệnh Hữu Ích

| Lệnh | Thư mục | Mục đích |
| --- | --- | --- |
| `npm test` | `server/` | Chạy test backend bằng Jest |
| `npm run dev` | `server/` | Chạy API với Nodemon |
| `pytest` | `ai-worker/` | Chạy test AI worker |
| `npm run dev` | `web/` | Chạy Vite web dev server |
| `npm run build` | `web/` | Build web production |
| `npm run test:run` | `web/` | Chạy web test một lần |
| `npm start` | `mobile/` | Chạy Expo dev server |
| `npm test` | `mobile/` | Chạy mobile Jest tests |
| `npm run build:android:preview` | `mobile/` | Build Android preview bằng EAS |

#### Triển Khai Production

Production deployment được định nghĩa trong:

- `docker-compose.prod.yml`
- `deploy/oracle/README.md`
- `deploy/oracle/scripts/`
- `.github/workflows/deploy-prod.yml`

Production stack build và chạy:

- `web`
- `server`
- `ai-worker`
- `redis`
- `nginx` edge proxy

MongoDB được kỳ vọng chạy bên ngoài Compose, ví dụ MongoDB Atlas. Các biến môi trường production dựa trên `deploy/oracle/.env.production.example`.

### Cấu Trúc Project

```text
kollector/
|-- ai-worker/                 # FastAPI AI service cho phân tích, xóa nền và tăng cường ảnh
|-- deploy/                    # Script deploy Oracle VM, template Nginx, env production mẫu
|-- mobile/                    # Ứng dụng mobile Expo / React Native
|-- projects/                  # Tài liệu hoặc artifact hỗ trợ dự án
|-- scripts/                   # Script helper cấp repository
|-- server/                    # Express API, MongoDB models, BullMQ workers, Socket.IO, tests
|   |-- src/
|   |   |-- common/             # Tiện ích backend dùng chung
|   |   |-- config/             # Cấu hình database, Redis, Socket.IO, storage, logging
|   |   |-- contracts/          # Đăng ký OpenAPI contract
|   |   |-- middleware/         # Middleware auth, admin, upload, validation, error
|   |   |-- models/             # Mongoose models
|   |   |-- modules/            # Domain auth, assets, admin, gamification, subscription
|   |   `-- workers/            # Worker AI, enhancement, decay, subscription maintenance
|   `-- tests/                 # Contract, integration và unit tests
|-- specs/                     # Spec sản phẩm, implementation plan, data model, contracts, quickstart
|-- web/                       # Dashboard web React / TypeScript / Vite
|   |-- src/
|   |   |-- components/         # UI và component theo tính năng
|   |   |-- contexts/           # Auth, socket, toast contexts
|   |   |-- hooks/              # Hook dữ liệu và realtime phía client
|   |   |-- lib/                # API clients, mapper, helper
|   |   |-- pages/              # Trang public, authenticated và admin
|   |   |-- types/              # TypeScript types dùng chung
|   |   `-- router.tsx          # Cấu hình React Router
|   `-- tests/                 # Unit và integration tests cho web
|-- docker-compose.prod.yml    # Compose stack production
|-- package-lock.json          # Metadata lock npm cấp root
`-- README.MD                  # README của project
```

### Đóng Góp

1. Tạo feature branch từ branch chính hiện tại.
2. Giữ thay đổi tập trung vào một feature hoặc một bug fix.
3. Tuân theo ranh giới module hiện có trong `server/`, `web/`, `mobile/` và `ai-worker/`.
4. Thêm hoặc cập nhật test khi thay đổi behavior.
5. Chạy các lệnh kiểm tra liên quan trước khi mở pull request:

```bash
cd server && npm test
cd ../web && npm run test:run && npm run build
cd ../mobile && npm test
cd ../ai-worker && pytest
```

6. Cập nhật spec hoặc quickstart liên quan trong `specs/` khi thay đổi behavior sản phẩm hoặc API contract.

### Giấy Phép

Repository hiện chưa có file license cấp root. Package backend khai báo `ISC` trong `server/package.json`, nhưng license cho toàn bộ repository cần được xác nhận trước khi phân phối hoặc tái sử dụng công khai.

### Liên Hệ / Tác Giả

- Repository: `https://github.com/BossHoder/kollector`
- Tác giả / Maintainer: `theanhdola`
- Email quan sát được trong script/lịch sử dự án: `thetruong275@gmail.com`
