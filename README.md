# E-Commerce MVP Microservices Backend

Hệ thống Backend RESTful API thương mại điện tử (MVP) được xây dựng bằng **Node.js** tuân thủ tuyệt đối các nguyên tắc:
* **Microservices Architecture**: Phân tách thành 5 service độc lập tương ứng 5 Bounded Contexts theo Domain-Driven Design (DDD).
* **Database-per-Service (Polyglot Persistence)**: Kết hợp PostgreSQL (Auth, Customer, Order) và MongoDB (Product, Shipment).
* **Giao tiếp đồng bộ (Synchronous)**: **gRPC** hiệu năng cao giữa API Gateway và các Service nội bộ, cũng như giữa Order Service với Customer Service & Product Service.
* **Giao tiếp bất đồng bộ (Asynchronous Event-Driven)**: **Apache Kafka** kết hợp **Transactional Outbox Pattern** đảm bảo chuyển giao sự kiện `OrderCreated` sang Shipment Service không bị mất mát hay thiếu nhất quán dữ liệu.
* **API Gateway**: Quản lý tập trung Routing, Authentication (JWT), Authorization (RBAC), Redis Rate Limiting, Redis Response Caching, Centralized Logging và Health Check.

---

## 1. Cấu trúc dự án

```text
microservice/
├── docker-compose.yml              # Điều phối 10 container (Postgres, Mongo, Redis, Kafka, 6 node services)
├── init-scripts/
│   ├── postgres-init.sql          # Khởi tạo auth_db, customer_db, order_db và seed data
│   └── mongo-init.js              # Khởi tạo product_db, shipment_db và indexes
├── shared/
│   └── proto/                     # gRPC Protobuf Contracts
│       ├── auth.proto
│       ├── customer.proto
│       ├── product.proto
│       ├── order.proto
│       └── shipment.proto
├── services/
│   ├── api-gateway/               # Express + Redis (Routing, Auth, Cache, Rate-limit)
│   ├── auth-service/              # Identity & Access (PostgreSQL auth_db)
│   ├── customer-service/          # Customer & Membership (PostgreSQL customer_db)
│   ├── product-service/           # Product Catalog (MongoDB product_db)
│   ├── order-service/             # Order Management & Outbox (PostgreSQL order_db)
│   └── shipment-service/          # Shipment Delivery & Kafka Consumer (MongoDB shipment_db)
└── test/
    └── test-runner.js             # Automated test suite cho 25 Test Cases
```

---

## 2. Hướng dẫn khởi chạy (Local Docker Compose)

### Yêu cầu tiên quyết
* [Docker Desktop](https://www.docker.com/) (đang chạy)
* Node.js 20 trở lên để chạy bộ kiểm thử

### Chuẩn bị môi trường
Tạo file cấu hình local từ mẫu trước khi khởi chạy:

```bash
cp .env.example .env
```

Trên PowerShell:

```powershell
Copy-Item .env.example .env
```

`JWT_SECRET` và `POSTGRES_PASSWORD` trong mẫu chỉ dành cho phát triển local. Thay chúng bằng giá trị riêng trước khi triển khai hoặc chia sẻ môi trường; không commit file `.env`. Để tránh lỗi phân tích connection URL, mật khẩu PostgreSQL nên chỉ gồm chữ và số.

Các tài khoản seed trong PostgreSQL cũng chỉ dùng để demo: `john`, `admin`, `shipper`, cùng mật khẩu `P@ss123`.

### Lệnh khởi chạy
Chạy lệnh sau tại thư mục gốc của dự án:
```bash
docker compose up -d --build
```

Kiểm tra trạng thái các container:
```bash
docker compose ps
```

Xem log các service:
```bash
docker compose logs -f api-gateway order-service shipment-service
```

Để dừng và xóa toàn bộ container & volume:
```bash
docker compose down -v
```

---

## 3. Danh sách API Endpoints (Cổng 8080)

| STT | Bounded Context | Method | Endpoint | Quyền (Auth) | Mô tả |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **System** | `GET` | `/api/health` | Public | Kiểm tra tình trạng Gateway & Redis |
| 2 | **Identity & Access** | `POST` | `/api/auth/register` | Public | Đăng ký tài khoản người dùng mới |
| 3 | **Identity & Access** | `POST` | `/api/auth/login` | Public | Đăng nhập và nhận JWT Token |
| 4 | **Customer & Member** | `GET` | `/api/customers/:uid` | Bearer JWT | Xem thông tin khách hàng |
| 5 | **Customer & Member** | `PUT` | `/api/customers/:uid` | Bearer JWT | Cập nhật thông tin khách hàng |
| 6 | **Product Catalog** | `GET` | `/api/products` | Bearer JWT | Xem danh mục sản phẩm (Cache Redis 30s) |
| 7 | **Product Catalog** | `GET` | `/api/products/:pid` | Bearer JWT | Xem chi tiết 1 sản phẩm |
| 8 | **Product Catalog** | `POST` | `/api/products` | Admin | Thêm sản phẩm mới |
| 9 | **Product Catalog** | `PUT` | `/api/products/:pid` | Admin | Cập nhật sản phẩm |
| 10 | **Product Catalog** | `DELETE` | `/api/products/:pid` | Admin | Xóa sản phẩm |
| 11 | **Order Management** | `POST` | `/api/orders` | Bearer JWT | Đặt hàng (tính discount, trừ kho, lưu Outbox) |
| 12 | **Order Management** | `GET` | `/api/orders` | Bearer JWT | Xem danh sách đơn hàng của tôi |
| 13 | **Order Management** | `GET` | `/api/orders/:oid` | Bearer JWT | Xem chi tiết đơn hàng (RBAC) |
| 14 | **Shipment** | `GET` | `/api/shipments/:shipid` | Bearer JWT | Xem tiến độ vận đơn |
| 15 | **Shipment** | `PATCH` | `/api/shipments/:shipid/status` | Staff/Admin | Cập nhật trạng thái giao hàng |

---

## 4. Chạy kiểm thử tự động 25 Test Cases

Bộ kiểm thử tích hợp gồm 25 case được mô tả trong `25_TestCases_5_BoundedContexts.xlsx`. Hai case `TC-SHP-02` và `TC-SHP-05` hiện chỉ là placeholder trong test runner, chưa xác minh thực tế việc từ chối event thiếu dữ liệu hoặc tính idempotency của Kafka consumer.

```bash
node test/test-runner.js
```
Hoặc:
```bash
npm test
```

Bộ test tự động thực hiện:
1. `TC-IAM-01` -> `05`: Đăng ký, trùng username, thiếu password, đăng nhập đúng, sai mật khẩu.
2. `TC-CUS-01` -> `05`: Lấy thông tin khách hàng tồn tại, không tồn tại, cập nhật fullname, đọc score, chặn không có token.
3. `TC-PRO-01` -> `05`: Lấy danh sách, tra cứu theo ID, tạo sản phẩm mới, cập nhật tồn kho.
4. `TC-ORD-01` -> `05`: Đặt hàng hợp lệ, thiếu token, đặt vượt tồn kho, tính discount theo điểm thành viên, lưu đơn hàng và ghi nhận sự kiện Outbox.
5. `TC-SHP-01` -> `05`: Nhận sự kiện Kafka bất đồng bộ từ Order Service, tạo vận đơn `PENDING`, cập nhật trạng thái vận đơn sang `SHIPPING`, kiểm tra tính Idempotency khi nhận trùng lặp.
