# Cổ Đài Mật Mã — Chia Sẻ Mã QR Theo Tên Miền Riêng & Hướng Dẫn Gắn Subdomain Cloud Run

Bản nâng cấp bổ sung **Bảng Mã QR Pixel & Tuỳ Chỉnh Tên Miền Chia Sẻ (`game.tenmiencuaban.com`)** ngay trong Sảnh Chờ Co-op để bạn bè quét mã vào thẳng phòng chơi, đồng thời cung cấp quy trình chuẩn từng bước để trỏ tên miền phụ từ nhà đăng ký Việt Nam (Mắt Bão, Nhân Hòa, Tenten, PA Việt Nam) về Google Cloud Run.

## User Review & Critical Decisions

> [!IMPORTANT]
> Các lựa chọn đã được xác nhận từ câu trả lời của bạn:

- **Loại tên miền sử dụng (Đã xác nhận)**: **Tên miền phụ (Subdomain)** dạng `game.tenmiencuaban.com` — Đây là phương án tối ưu nhất trên Google Cloud Run vì chỉ cần 1 bản ghi `CNAME` duy nhất, không làm ảnh hưởng đến website chính (`tenmiencuaban.com`) và kích hoạt chứng chỉ bảo mật SSL nhanh nhất.
- **Nhà quản trị DNS (Đã xác nhận)**: **Nhà cung cấp tại Việt Nam (Mắt Bão, Nhân Hòa, Tenten, PA Việt Nam)** — Hướng dẫn và công cụ kiểm tra trong game được thiết kế khớp với giao diện cấu hình `Host Record / CNAME` của các nhà đăng ký này.
- **Tính năng bổ sung trong game (Đã xác nhận)**: **Bảng Mã QR & Nút Chia Sẻ Link Mời theo Tên Miền Riêng** — Cho phép bạn nhập sẵn tên miền riêng (hoặc tự động lấy tên miền khi người chơi truy cập qua `game.tenmiencuaban.com`), tự động tạo **Mã QR sắc nét** và đường dẫn mời `?room=ABCDEF` để bạn bè quét bằng điện thoại hoặc sao chép chỉ với 1 chạm.

---

## 1. Hướng Dẫn Chi Tiết Cách 1: Gắn `game.tenmiencuaban.com` Trên Google Cloud Run

Quy trình gồm **4 bước** thực hiện giữa Google AI Studio, Google Cloud Console và trang quản trị DNS của bạn:

### Bước 1: Triển khai (Deploy) trò chơi lên Google Cloud Run
1. Ở góc trên bên phải giao diện Google AI Studio, nhấn nút **Deploy** (hoặc biểu tượng đám mây **Deploy to Cloud Run**).
2. Chọn **Google Cloud Project** của bạn (đảm bảo dự án đã bật thanh toán/Billing cơ bản của Google Cloud) và nhấn xác nhận.
3. Sau khoảng 1–2 phút, Google AI Studio sẽ tạo một dịch vụ Cloud Run đang chạy trò chơi của bạn (thường ở vùng `asia-east1` hoặc `us-central1`).

### Bước 2: Khai báo tên miền phụ trong Google Cloud Run
1. Mở [Google Cloud Console — Cloud Run](https://console.cloud.google.com/run) và chọn đúng Project vừa Deploy.
2. Nhấn nút **Manage Custom Domains** (Quản lý tên miền tùy chỉnh) trên thanh công cụ phía trên cùng.
3. Nhấn **Add Mapping** (Thêm ánh xạ tên miền):
   - **Select a service to map to**: Chọn dịch vụ Cloud Run của trò chơi.
   - **Select a verified domain**: Nếu tên miền của bạn chưa từng xác minh với Google, chọn **Verify a new domain** → nhập tên miền gốc `tenmiencuaban.com` → Google Search Console sẽ cấp 1 dòng mã `TXT` (dạng `google-site-verification=...`).
   - Sau khi xác minh xong, tại ô **Specify subdomain**, nhập **`game`** để tạo địa chỉ đầy đủ là `game.tenmiencuaban.com`.
4. Nhấn **Continue**, màn hình sẽ hiển thị bản ghi yêu cầu:
   - **Loại (Type)**: `CNAME`
   - **Tên (Host / Name)**: `game`
   - **Giá trị (Canonical name / Value)**: `ghs.googlehosted.com.`

### Bước 3: Trỏ bản ghi CNAME tại Mắt Bão / Nhân Hòa / Tenten / PA Việt Nam
Đăng nhập vào trang quản trị tên miền của bạn và thêm **1 bản ghi mới** theo đúng thông số sau:

```
┌──────────────────┬───────────────────────┬───────────────────────────┬─────────┐
│ Tên trường (DNS) │ Giá trị cần nhập      │ Lưu ý theo nhà cung cấp   │ TTL     │
├──────────────────┼───────────────────────┼───────────────────────────┼─────────┤
│ Host / Tên       │ game                  │ Không ghi thêm tên miền   │ 300s    │
│ Loại (Type)      │ CNAME                 │ Chọn CNAME Record         │ hoặc    │
│ Giá trị (Value)  │ ghs.googlehosted.com  │ Mắt Bão/Tenten tự thêm "."│ Mặc định│
└──────────────────┴───────────────────────┴───────────────────────────┴─────────┘
```

- **Mắt Bão (id.matbao.net)**: Vào *Tên miền* → *Quản lý DNS* → *Thêm bản ghi* → Host: `game`, Loại: `CNAME`, Giá trị: `ghs.googlehosted.com`.
- **Nhân Hòa (zonedns.vn)**: Vào *Cấu hình DNS* → Thêm dòng mới → Tên Record: `game`, Loại: `CNAME`, Giá trị: `ghs.googlehosted.com.`.
- **Tenten (domain.tenten.vn)**: Vào *Cài đặt DNS* → Thêm bản ghi → Subdomain: `game`, Type: `CNAME`, Value: `ghs.googlehosted.com`.
- **PA Việt Nam (dotvndns.vn)**: Vào *Cấu hình Host Record* → Host: `game`, Loại: `CNAME (Alias)`, Địa chỉ: `ghs.googlehosted.com`.

### Bước 4: Chờ cấp chứng chỉ SSL tự động (10 – 20 phút)
- Sau khi lưu bản ghi DNS, quay lại tab **Custom Domains** trên Google Cloud Run và nhấn **Done**.
- Google Cloud sẽ tự động kiểm tra bản ghi `CNAME` và cấp chứng chỉ bảo mật **HTTPS / WSS** (biểu tượng vòng tròn xoay sẽ chuyển thành **Dấu tích xanh**).
- Ngay khi có dấu tích xanh, bạn và bạn bè có thể truy cập trực tiếp `https://game.tenmiencuaban.com`!

---

## 2. User Experience & Visual Design (Tính Năng Bổ Sung Trong Game)

- **Key User Flows**:
  1. **Mở Bảng Chia Sẻ Mã QR & Tên Miền Riêng**:
     - Trong **Sảnh Chờ Online Co-op** hoặc ngay trên **Thanh trạng thái Phòng (`PHÒNG #ABCDEF`)**, người chơi nhấn nút **"Mã QR & Tên Miền"**.
  2. **Tuỳ Chỉnh Tên Miền Hiển Thị (`game.tenmiencuaban.com`)**:
     - Hệ thống tự động lấy tên miền hiện tại trên trình duyệt làm mặc định.
     - Ngoài ra có ô nhập **"Tên miền riêng của bạn"** (ví dụ: `https://game.tenmiencuaban.com` — được lưu vào `localStorage`) để ngay cả khi bạn đang mở bản thử nghiệm, game vẫn tạo sẵn đúng đường link mời và Mã QR trỏ về tên miền riêng của bạn.
  3. **Quét Mã QR Pixel & Chia Sẻ Nhanh**:
     - Hiển thị **Mã QR độ tương phản cao** được vẽ trực tiếp trên `<canvas>`/`<svg>` (không phụ thuộc dịch vụ bên ngoài) chứa đường dẫn vào thẳng phòng: `https://game.tenmiencuaban.com/?room=ABCDEF`.
     - Cung cấp nút **"Sao Chép Link Mời"**, **"Sao Chép Mã Phòng"** và bảng tóm tắt nhanh thông số `CNAME` (`game` → `ghs.googlehosted.com`) ngay trong hộp thoại để bạn tiện tra cứu khi cài đặt DNS.

- **Visual Identity & Theme**:
  - Giữ đồng nhất phong cách **Carved Obsidian Pixel Temple** (`#161b26` nền đá, viền `#384358`, điểm nhấn vàng cổ tự `#fbbf24` và lam tinh `#38bdf8`).
  - Mã QR được đóng khung trong một phiến đá cổ tự sắc nét, đảm bảo camera điện thoại quét nhạy ở mọi khoảng cách.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Bộ tạo Mã QR nội bộ thuần TypeScript (Zero External API Dependency)**
  - *Chosen Approach*: Tích hợp bộ mã hóa và vẽ Mã QR chuẩn ISO/IEC 18004 trực tiếp bằng `<svg>` trong ứng dụng thay vì gọi API ảnh QR bên ngoài.
  - *Why*: Đảm bảo Mã QR hiển thị tức thì (0ms), sắc nét tuyệt đối theo phong cách pixel và không bao giờ bị lỗi ảnh hỏng trong môi trường bảo mật.

- **Decision 2: Lưu trữ cấu hình Tên Miền Riêng kết hợp Tự động nhận diện (`window.location.origin`)**
  - *Chosen Approach*: Nếu người chơi truy cập từ tên miền riêng đã gắn xong, game tự động dùng `window.location.origin`. Nếu người chơi nhập tên miền tuỳ chỉnh (ví dụ `https://game.tenmiencuaban.com`), game ưu tiên dùng tên miền đó để xuất Link mời & Mã QR.
  - *Why*: Linh hoạt cho cả giai đoạn đang cấu hình DNS lẫn khi đã vận hành chính thức.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│                 SẢNH CHỜ CO-OP & THANH TRẠNG THÁI PHÒNG                  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │            Hộp Thoại Mã QR & Tên Miền Riêng (Share Modal)          │  │
│  │                                                                    │  │
│  │  [Ô nhập Tên Miền: https://game.tenmiencuaban.com]  [Lưu Tên Miền] │  │
│  │                                                                    │  │
│  │  ┌──────────────────┐   Link Phòng Trực Tiếp:                      │  │
│  │  │  ▄▄▄▄▄ ▄ ▄▄▄▄▄   │   https://game.tenmiencuaban.com/?room=COOP1 │  │
│  │  │  █   █ █ █   █   │                                              │  │
│  │  │  ▀▀▀▀▀ ▀ ▀▀▀▀▀   │   [Sao Chép Link Mời]   [Tải Ảnh Mã QR]      │  │
│  │  │   MÃ QR PHÒNG    │                                              │  │
│  │  └──────────────────┘   Bảng Tra Cứu Nhanh CNAME (Mắt Bão/Tenten): │  │
│  │                         Host: game  |  Type: CNAME                 │  │
│  │                         Value: ghs.googlehosted.com                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

- **Trình Tạo Mã QR (`QrCodeSvg`)**: Nhận chuỗi URL phòng chơi (`<domain>/?room=<roomId>`) và kết xuất ma trận QR chuẩn thành lưới ô vuông `<svg>` độ tương phản cao.
- **Bộ Quản Lý Tên Miền Riêng**: Đọc/ghi khóa `chrono_custom_domain` trong `localStorage`, chuẩn hóa tiền tố `https://`, loại bỏ dấu `/` thừa ở cuối và cập nhật tức thì Mã QR cùng Link mời mỗi khi người dùng thay đổi tên miền hoặc đổi phòng.
- **Cấu Hình Khởi Chạy Production**: Đảm bảo tập lệnh khởi động máy chủ trên Cloud Run phục vụ đồng thời thư mục tĩnh đã đóng gói và kênh WebSocket `/ws` trên cổng `3000` (hoặc `process.env.PORT`).
