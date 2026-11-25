# Hướng dẫn cài đặt Sổ Xe Offline trên Android (PWA & File APK)

Ứng dụng **Sổ Xe** đã được đóng gói sẵn cho cả **2 cách cài đặt offline** trên điện thoại Android (toàn bộ dữ liệu xe `spark 0.8` và lịch sử đổ xăng / bảo dưỡng được lưu ngay trên máy, không cần Internet).

---

## Cách 1: Cài đặt trực tiếp từ Chrome trên Android (Không cần máy tính)

1. Mở đường dẫn ứng dụng trên trình duyệt **Google Chrome** ở điện thoại Android.
2. Nhấn nút **Cài đặt lên Android** ở thanh menu bên trái (hoặc nhấn biểu tượng `⋮` trên Chrome → **Thêm vào màn hình chính / Cài đặt ứng dụng**).
3. Biểu tượng **Sổ Xe** sẽ xuất hiện trên màn hình chính và chạy toàn màn hình như ứng dụng cài từ APK, **hoạt động 100% ngoại tuyến (Offline)** nhờ Service Worker đã lưu sẵn toàn bộ mã nguồn và tệp CSV.

---

## Cách 2: Xuất file `.apk` cài đặt trực tiếp (dùng dự án Capacitor `android/` có sẵn)

Dự án đã tích hợp sẵn **Capacitor Android** (`capacitor.config.ts` và thư mục `android/`).

### Tùy chọn A — Tự động build `.apk` miễn phí bằng GitHub Actions (không cần cài Android Studio)
1. Tải mã nguồn dự án và đẩy lên một repository GitHub của bạn.
2. Vào tab **Actions** → chọn workflow **Build Android APK (Offline)** → nhấn **Run workflow**.
3. Sau khoảng 2–3 phút, tải tệp **`SoXe-Android-Offline-APK`** (chứa `app-debug.apk`) về điện thoại Android và mở để cài đặt offline.

### Tùy chọn B — Build `.apk` trực tiếp trên máy tính Windows / macOS / Linux
Yêu cầu: Node.js 20+, Java JDK 21, và Android SDK (hoặc Android Studio).

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

File APK xuất ra nằm tại:
`android/app/build/outputs/apk/debug/app-debug.apk`

Chép file `app-debug.apk` sang điện thoại Android và chạm vào để cài đặt.
