# HƯỚNG DẪN CÀI ĐẶT

### Yêu cầu môi trường

- **Node.js**: Phiên bản `v18.x` trở lên (khuyên dùng LTS).
- **Trình quản lý gói**: `npm` (đi kèm Node.js) hoặc `yarn` / `pnpm`.

### Các bước cài đặt & Khởi chạy

1. **Cài đặt các phụ thuộc (Dependencies)**:

   ```bash
   npm install
   ```

2. **Chạy ứng dụng ở chế độ phát triển (Development Mode)**:

   ```bash
   npm run dev
   ```

   Sau khi khởi chạy thành công, truy cập ứng dụng tại địa chỉ cục bộ được cung cấp bởi Vite (mặc định: `http://localhost:5173`).

3. **Kiểm tra cú pháp & Code Style (Linting)**:

   ```bash
   npm run lint
   ```

4. **Biên dịch ứng dụng cho Production (Build)**:

   ```bash
   npm run build
   ```

5. **Xem trước bản build Production (Preview)**:
   ```bash
   npm run preview
   ```

---

# CẤU TRÚC DỰ ÁN

Cấu trúc cây thư mục tổng quan của dự án `uit-imap-manager`:

```text
uit-imap-manager/
├── public/                 # Tài nguyên tĩnh của ứng dụng
├── src/
│   ├── assets/             # Hình ảnh, biểu tượng tĩnh
│   ├── components/
│   │   ├── main/           # Các thành phần giao diện chính của ứng dụng
│   │   │   ├── model/      # Thành phần hiển thị & tương tác mô hình 3D (ModelViewer)
│   │   │   └── tour/       # Thành phần xem & chỉnh sửa Panorama 360 (TourViewer, ScenesPreview)
│   │   └── ui/             # Các thành phần UI bổ trợ dùng chung (Button, Dialog, Editors, Modals)
│   ├── contexts/           # Các React Context quản lý trạng thái toàn cục (User, Tab, Data, Model, Floor, Pano)
│   ├── lib/                # Thư viện tiện ích, cấu hình HTTP client, types và hàm phụ trợ
│   │   ├── types/          # Khai báo TypeScript types chuyên biệt (pano.ts)
│   │   └── utils/          # Hàm đóng gói xử lý dữ liệu JSON, validate, cắt ảnh Panorama, tile registry
│   ├── App.tsx             # Component gốc quản lý Gate & phân luồng Provider
│   ├── index.css           # Cấu hình Tailwind CSS và style toàn cục
│   ├── main.tsx            # Điểm khởi chạy React (Entry Point)
│   └── vite-env.d.ts       # Định nghĩa kiểu môi trường Vite
├── index.html              # Tệp HTML mẫu
├── package.json            # Khai báo phụ thuộc và kịch bản npm
├── tsconfig.json           # Cấu hình TypeScript
└── vite.config.ts          # Cấu hình Vite bundler
```

---

### Luồng hoạt động

#### 1. Luồng khởi tạo Web (Initialization Flow)

1. **Xác thực người dùng (Gate & UserContext)**: Component [App.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/App.tsx) bao bọc ứng dụng trong `UserProvider` ([userContext.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/contexts/userContext.tsx)). Component `Gate` kiểm tra trạng thái xác thực `isAuthed`:
   - Nếu **chưa đăng nhập** (`isAuthed = false`): Hiển thị màn hình đăng nhập [Login.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Login.tsx).
   - Nếu **đã đăng nhập** (`isAuthed = true`): Khởi tạo chuỗi React State Providers theo thứ tự phân tầng:
     `DataProvider` ➔ `TabProvider` ➔ `ModelProvider` ➔ `FloorProvider` ➔ `PanoProvider` ➔ `Workspace`.
2. **Tải dữ liệu ban đầu**: Ngay khi `DataProvider` ([dataContext.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/contexts/dataContext.tsx)) được mount, hệ thống lập tức kích hoạt hàm `fetch()` song song cho 6 tập dữ liệu nghiệp vụ chính (`hotspots`, `rooms`, `edges`, `tourScenes`, `tourspots`, `transport`) từ CDN từ xa (`https://cdn.jsdelivr.net/gh/helitoo/uit-imap-data/`) thông qua module [httpClient.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/httpClient.ts).
3. **Hiển thị Workspace**: Component `Workspace` render cấu trúc giao diện làm việc gồm:
   - [Topbar.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Topbar.tsx): Thanh công cụ tác vụ phía trên cùng.
   - [RightBar.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/RightBar.tsx): Thanh danh mục điều hướng bên phải.
   - **Màn hình làm việc trung tâm**: Render động dựa theo tab active (`tab` từ `TabContext`):
     - Tab `model`: Render [ModelViewer.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/model/ModelViewer.tsx) (Xem & tương tác 3D GLB).
     - Tab `floorPreview`: Render [FloorPreview.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/FloorPreview.tsx) (Xem & biên tập sơ đồ phòng 2D).
     - Tab `tourScenes`: Render [ScenesPreview.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/tour/ScenesPreview.tsx) (Xem & tương tác toàn cảnh ảnh 360 tour).
     - Các tab dữ liệu còn lại (`hotspots`, `rooms`, `edges`, `tourspots`, `transport`): Render bảng dữ liệu tương tác [Table.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Table.tsx).

#### 2. Luồng kích hoạt các chức năng (Feature Execution Flow)

- **Đăng nhập / Đăng xuất**: Người dùng nhập tên tài khoản ở [Login.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Login.tsx) ➔ gọi `login(name)` chuyển `isAuthed = true` để mở khóa Workspace. Khi nhấn Đăng xuất, gọi `logout()` đặt lại `isAuthed = false` để chuyển về màn hình đăng nhập.
- **Điều chuyển Tab làm việc**: Chọn một tab bất kỳ trên [RightBar.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/RightBar.tsx) ➔ kích hoạt `setTab(id)` trong `TabContext` ➔ `Workspace` tự động chuyển đổi giao diện trung tâm tương ứng.
- **Thao tác Bảng Dữ Liệu ([Table.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Table.tsx))**:
  - _Xem/Tìm kiếm/Sắp xếp_: Nhập từ khóa vào ô tìm kiếm toàn cục hoặc click vào tiêu đề cột để sắp xếp dữ liệu (sử dụng `@tanstack/react-table`).
  - _Chỉnh sửa ô_: Double-click vào ô hợp lệ ➔ mở [EditCellDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/EditCellDialog.tsx) ➔ nhập/chọn giá trị mới qua [FieldEditor.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/FieldEditor.tsx) ➔ validate quy tắc ➔ gọi `editRow()` cập nhật `DataContext`.
  - _Thêm hàng mới_: Click nút "Add Row" ➔ mở [NewRowDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/NewRowDialog.tsx) ➔ điền thông tin bắt buộc ➔ gọi `addRow()`.
  - _Xóa hàng_: Click nút "Remove" tại hàng tương ứng ➔ xác nhận ➔ gọi `removeRow()`.
  - _Import JSON / ZIP_: Chọn "Upload JSON" (mở [UploadJsonDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/UploadJsonDialog.tsx)) hoặc "Upload zip/folder" (mở [UploadZipDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/UploadZipDialog.tsx)) ➔ phân tích dữ liệu ➔ chuyển qua [UploadPreviewDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/UploadPreviewDialog.tsx) để xem trước hàng mới/ghi đè ➔ xác nhận lưu vào context.
- **Định vị & Tương tác Mô Hình 3D ([ModelViewer.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/model/ModelViewer.tsx))**:
  - _Thêm Hotspot / Tourspot 3D_: Click nút "Add Hotspot" hoặc "Add Tourspot" ở [Topbar.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Topbar.tsx) ➔ chuyển sang chế độ `pickMode` ➔ di chuột trên bề mặt mô hình `@google/model-viewer` ➔ tia `positionAndNormalFromPoint` tính toán tọa độ 3D `[x, y, z]` và Vector pháp tuyến (Normal) ➔ click vị trí ➔ mở [NewRowDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/NewRowDialog.tsx) để lưu dữ liệu.
  - _Di chuyển điểm 3D (Drag & Drop)_: Click vào điểm Hotspot/Tourspot trên giao diện 3D ➔ điểm gán vào `movingItem` dính theo con trỏ chuột ➔ click vị trí mới trên bề mặt mô hình để cập nhật tọa độ.
  - _Thêm Cạnh nối (Edge)_: Click nút "Add Edge" ➔ click Hotspot thứ nhất ➔ click Hotspot thứ hai ➔ tự động tính toán đoạn nối ➔ mở [NewRowDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/NewRowDialog.tsx) để tạo cạnh nối.
- **Xem & Chỉnh Sửa Sơ Đồ Tầng ([FloorPreview.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/FloorPreview.tsx))**:
  - Chọn Tòa nhà (`Building`) và Tầng (`Floor`) từ thanh [Topbar.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Topbar.tsx).
  - Hệ thống lọc dữ liệu `rooms` tương ứng, tự động tính toán kích thước ô lưới `CELL_SIZE` và dựng sơ đồ theo CSS Grid.
  - Click vào phòng trên sơ đồ để chọn và điều chỉnh phạm vi hàng (`rows`) và cột (`cols`), hoặc nhập tọa độ và click "Add" để thêm phòng mới.
- **Xem & Quản Lý Toàn Cảnh 360 ([ScenesPreview.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/tour/ScenesPreview.tsx) & [TourViewer.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/tour/TourViewer.tsx))**:
  - Sử dụng thư viện `Marzipano` để render panorama 360 từ Cubemap tiles.
  - _Quản lý danh sách Scene_: Đổi tên scene (double-click), thay đổi thứ tự (nút Up/Down) hoặc xóa scene trực tiếp trên sidebar.
  - _Thêm điểm liên kết (Add linking spot)_: Click nút "Add linking spot" ➔ click vị trí trong bức ảnh 360 ➔ tính toán góc `yaw` & `pitch` ➔ chọn Scene mục tiêu ➔ thêm vào `linkHotspots`.
  - _Tùy chỉnh LinkHotspot_: Rê chuột vào điểm liên kết ➔ chọn thay đổi vị trí (`Relocate`), đổi scene đích (`Change Scene`), xoay hướng chỉ mũi tên (`0°` đến `270°`), hoặc xóa điểm.
  - _Xử lý & Cắt lát ảnh Panorama (Update/Upload Panorama)_: Tải ảnh toàn cảnh 2:1 (Equirectangular) ➔ module [panoProcessor.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/utils/panoProcessor.ts) sử dụng HTML5 Canvas chiếu sang 6 mặt Cubemap và cắt thành các gạch ảnh JPEG 512x512 đa phân giải ➔ lưu vào tệp nén `.zip` và đăng ký Blob URL với [tileRegistry.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/utils/tileRegistry.ts) để xem trước tức thì.

---

### Các hàm phụ trợ

Thư mục `@/src/lib` ([src/lib](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib)) bao gồm các module quản lý giao tiếp HTTP, định nghĩa kiểu dữ liệu và các hàm xử lý tiện ích:

#### 1. [httpClient.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/httpClient.ts)

Cấu hình giao tiếp HTTP client đọc dữ liệu từ CDN:

- `BASE_URL`: Hằng số chứa URL CDN gốc (`https://cdn.jsdelivr.net/gh/helitoo/uit-imap-data/`).
- `httpGet<T>(endpoint: string, fallback: T): Promise<T>`: Thực hiện lệnh HTTP GET fetch dữ liệu JSON từ CDN với tham số `{ cache: "no-store" }`. Nếu yêu cầu thất bại hoặc gặp lỗi mạng, hàm ghi cảnh báo và trả về giá trị `fallback` an toàn.
- `resolveUrl(endpoint: string): string`: Hàm tiện ích ghép đường dẫn URL đầy đủ từ `BASE_URL` và endpoint.
- `ENDPOINTS`: Đối tượng hằng lưu tên các tệp JSON endpoint (`hotspots`, `rooms`, `edges`, `tourScenes`, `tourspots`, `transport`).

#### 2. [types.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/types.ts)

Khai báo toàn bộ kiểu dữ liệu TypeScript cốt lõi của ứng dụng:

- `DataId`: Type union danh định 6 tập dữ liệu (`"hotspots" | "rooms" | "edges" | "tourScenes" | "tourspots" | "transport"`).
- `TabId`: Type union 8 tab chức năng chính (`DataId | "model" | "floorPreview"`).
- `User`: Interface đối tượng người dùng (`{ name: string }`).
- `Edge`: Type biểu diễn đường nối giữa 2 hotspot (`{ first: string; second: string }`).
- `Category`: Type phân loại phòng (`"classroom" | "computer_room" | "hall" | "lab" | "library" | "office" | "stairs" | "warehouse" | "wc" | "tech"`).
- `CATEGORY_COLORS` & `CATEGORY_LABELS`: Map định màu sắc Tailwind CSS và nhãn hiển thị tiếng Việt tương ứng cho từng phân loại phòng.
- `Hotspot`: Interface điểm 3D trên mô hình (`id`, `name`, `description`, `dataPosition: [x,y,z]`, `dataNormal: [x,y,z]`).
- `Room`: Interface thông tin phòng học/chức năng (`id`, `name`, `floor`, `belongsTo`, `category`, `rows`, `cols`, `hasEvent`).
- `TourLevel` & `ViewParameters`: Interface thông số phân giải gạch ảnh và góc quay nhìn ban đầu (`yaw`, `pitch`, `fov`) của scene 360.
- `LinkHotspot` & `InfoHotspot`: Interface biểu diễn điểm liên kết chuyển cảnh 360 và điểm thông tin hiển thị trên panorama.
- `TourScene` & `MarzipanoScene`: Interface mô tả một cảnh panorama 360 đầy đủ và đối tượng scene Marzipano tương ứng.
- `Tourspot`: Interface điểm Tourspot liên kết 3D với TourScene (`id`, `sceneId`, `dataPosition`, `dataNormal`).
- `Transport`: Interface điểm phương tiện giao thông công cộng (`spot`, `name`, `type`, `providers`).
- `TableRule`: Interface quy tắc cấu hình thuộc tính hiển thị, biên tập và validation cho bảng dữ liệu.
- `DataSlice<T>`: Interface tiêu chuẩn quản lý slice dữ liệu nghiệp vụ trong `DataContext`.
- `UploadPreviewRow`: Interface dữ liệu cho bảng xem trước import file.

#### 3. [pano.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/types/pano.ts)

Module re-export tập hợp các interface dành riêng cho xử lý ảnh toàn cảnh 360 (`TourScene`, `LinkHotspot`, `InfoHotspot`, `ViewParameters`, `TourLevel`, `MarzipanoScene`).

#### 4. [utils.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/utils.ts)

Tệp chứa các hàm tiện ích tổng hợp:

- `cn(...classes: (string | undefined | null | false)[]): string`: Hàm ghép nối các class CSS linh hoạt, tự động lọc bỏ các giá trị falsy.
- `getSceneShareUrl(sceneId: string): string`: Tạo đường dẫn URL chia sẻ cảnh 360 với tham số `sceneId` trên thanh địa chỉ.

#### 5. [jsons.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/utils/jsons.ts)

Tệp chứa các hàm tiện ích xử lý định dạng JSON và tải tệp:

- `objectToJson(object: unknown, pretty = true): string`: Chuyển đối tượng JS thành chuỗi JSON được định dạng thụt lùi dòng an toàn.
- `jsonToObject<T = any>(json: string): T`: Phân tích chuỗi JSON sang đối tượng JS kiểu `T`.
- `tryJsonToObject<T = any>(json: string)`: Safe-parse JSON trả về object chứa kết quả thành công `{ ok: true, value }` hoặc lỗi `{ ok: false, error }`.
- `downloadJson(filename: string, data: unknown)`: Tạo Blob dữ liệu JSON và kích hoạt đường dẫn tải tệp `.json` xuống máy tính người dùng.

#### 6. [panoProcessor.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/utils/panoProcessor.ts)

Thư viện xử lý và cắt lát ảnh Panorama 360 Equirectangular chuyên sâu:

- Hằng số cấu hình: `TILE_SIZE = 512`, `MIN_FACE_SIZE = 512`, `CUBE_FACES = ["f", "b", "l", "r", "u", "d"]`.
- `loadImage(file: File): Promise<HTMLImageElement>`: Tải tệp ảnh người dùng chọn thành đối tượng `HTMLImageElement` sử dụng `URL.createObjectURL`.
- `buildCubeLevels(maxFaceSize: number, minSize = 512): number[]`: Tính toán mảng danh sách kích thước các mức phân giải Cubemap (giảm một nửa từ `maxFaceSize` về `512`).
- `equirectangularToCubemap(sourceCanvas, faceSize, onFaceProgress)`: Chiếu toán học ảnh Equirectangular 2:1 từ `sourceCanvas` sang 6 mặt vuông Cubemap lập phương sử dụng thuật toán nội suy song tuyến (Bilinear Interpolation).
- `processPanoramaFile(file: File, options)`: Quy trình tự động xử lý ảnh toàn cảnh 2:1 đầy đủ:
  1. Kiểm tra tỷ lệ khía cạnh ảnh 2:1 (rộng / cao ~ 2.0).
  2. Chiếu sang 6 mặt Cubemap `masterFaces`.
  3. Xây dựng danh sách các level phân giải và danh sách các tác vụ cắt gạch tile.
  4. Cắt gạch ảnh JPEG kích thước 512x512 song song bằng hàm `mapConcurrent` với giới hạn concurrency.
  5. Đóng gói các tệp gạch ảnh và file cấu hình `data.json` vào tệp ZIP (`JSZip`).
  6. Đăng ký tập hợp Blob URL với `tileRegistry` để xem trước giao diện lập tức.

#### 7. [prototypes.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/utils/prototypes.ts)

Các hàm khởi tạo nhanh quy tắc `TableRule` mẫu:

- `xyArrRule(name: string, label: string, mandatory = true): TableRule`: Tạo quy tắc cấu hình mảng 2 số cố định (ví dụ: `rows`, `cols`).
- `xyzArrRule(name: string, label: string, mandatory = true): TableRule`: Tạo quy tắc cấu hình mảng 3 số cố định (ví dụ: `dataPosition`, `dataNormal`).
- `idRule(label = "ID"): TableRule`: Tạo quy tắc cấu hình trường khóa chính ID (bắt buộc, cho phép sắp xếp, không thể sửa).

#### 8. [tileRegistry.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/utils/tileRegistry.ts)

Quản lý bộ nhớ lưu trữ Blob URL cho các gạch ảnh Panorama xem trước cục bộ:

- `registerTileBlob(key: string, blobUrl: string): void`: Đăng ký 1 Blob URL tương ứng với khóa tile key.
- `registerTileBlobs(sceneId: string, blobs: Record<string, string>): void`: Đăng ký hàng loạt Blob URL gạch ảnh cho 1 cảnh panorama.
- `getTileBlobUrl(key: string): string | undefined`: Tra cứu Blob URL nội bộ nếu có.
- `clearTileBlobs(): void`: Xóa sạch bộ nhớ Blob URL và gọi `URL.revokeObjectURL` để ngăn ngừa rò rỉ bộ nhớ RAM.

#### 9. [validator.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/utils/validator.ts)

Bộ hàm kiểm tra tính hợp lệ của dữ liệu trước khi lưu:

- `isUniqueValue(value: any, existingValues: any[], ignoreIndex?: number): boolean`: Kiểm tra giá trị nhập vào không trùng lặp với danh sách hiện có (dùng kiểm tra tính duy nhất của khóa chính ID).
- `isValidRef(foreignValue: any, primaryValues: any[]): boolean`: Kiểm tra tính toàn vẹn tham chiếu khóa ngoại (ví dụ: `Room.belongsTo` tham chiếu đến `Hotspot.id`).
- `isValidMandatory(value: any): boolean`: Kiểm tra thuộc tính bắt buộc không được để rỗng, null hoặc undefined.
- `isValidFixedArray(value: any, size: number): boolean`: Kiểm tra mảng phải có đúng số lượng phần tử cố định và không chứa phần tử rỗng.

---

### Contexts

Dự án ứng dụng kiến trúc 6 React Contexts toàn cục ([src/contexts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/contexts)) để quản lý trạng thái nghiệp vụ và giao diện ứng dụng:

#### 1. `UserContext` ([src/contexts/userContext.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/contexts/userContext.tsx))

Quản lý trạng thái xác thực và thông tin tài khoản người dùng đang truy cập.

- **States**:
  - `user: User | null`: Thông tin đối tượng người dùng hiện tại (mặc định khởi tạo: `{ name: "Admin" }`).
  - `isAuthed: boolean`: Cờ xác thực đăng nhập (true: cho phép truy cập Workspace, false: khóa tại màn hình Login).
- **Functions**:
  - `setUser(user: User | null)`: Cập nhật đối tượng thông tin người dùng.
  - `setIsAuthed(v: boolean)`: Đặt trực tiếp cờ trạng thái xác thực.
  - `login(name: string)`: Đăng nhập vào hệ thống với tên người dùng chỉ định (chuyển `isAuthed = true`).
  - `logout()`: Đăng xuất khỏi hệ thống (gán `user = null` và `isAuthed = false`).

#### 2. `TabContext` ([src/contexts/tabContext.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/contexts/tabContext.tsx))

Quản lý tab chức năng đang được chọn để hiển thị ở khu vực trung tâm Workspace.

- **States**:
  - `tab: TabId`: Tab hiện tại đang được chọn (nhận 1 trong các giá trị: `"model" | "floorPreview" | "hotspots" | "rooms" | "edges" | "tourspots" | "tourScenes" | "transport"`).
- **Functions**:
  - `setTab(tab: TabId)`: Chuyển đổi ứng dụng sang làm việc tại tab mới.

#### 3. `DataContext` ([src/contexts/dataContext.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/contexts/dataContext.tsx))

Quản lý toàn bộ 6 tập dữ liệu nghiệp vụ của hệ thống được tải từ CDN và duy trì trong bộ nhớ client.

- **Data Slices**:
  - `hotspots: DataSlice<Hotspot>`: Slice dữ liệu các điểm Hotspot 3D.
  - `rooms: DataSlice<Room>`: Slice dữ liệu các phòng học/chức năng.
  - `edges: DataSlice<Edge>`: Slice dữ liệu các đoạn đường nối giữa các Hotspot.
  - `tourScenes: DataSlice<TourScene>`: Slice dữ liệu danh sách cảnh panorama 360.
  - `tourspots: DataSlice<Tourspot>`: Slice dữ liệu các điểm Tourspot trên mô hình 3D.
  - `transport: DataSlice<Transport>`: Slice dữ liệu điểm phương tiện công cộng (bus/metro).
- **Chi Tiết Thành Phần Trong Mỗi `DataSlice`**:
  - _States_:
    - `data: T[]`: Mảng chứa các đối tượng dữ liệu hiện tại.
    - `loading: boolean`: Trạng thái đang tải dữ liệu từ CDN.
    - `error: string | null`: Thông báo lỗi nếu quá trình đọc dữ liệu thất bại.
    - `tableRules: TableRule[]`: Danh sách các quy tắc cấu hình thuộc tính hiển thị và validation cho bảng.
    - `rowIdKey: string`: Tên trường đóng vai trò là khóa chính (Primary Key).
  - _Functions_:
    - `fetch(): Promise<void>`: Hàm bất đồng bộ gọi HTTP GET để nạp dữ liệu ban đầu từ CDN.
    - `addRow(row: T)`: Thêm một phần tử dữ liệu mới vào tập dữ liệu.
    - `removeRow(rowIdx: number)`: Xóa một phần tử dữ liệu theo chỉ số hàng `rowIdx`.
    - `editRow(attribute: string, rowIdx: number, newValue: any)`: Chỉnh sửa giá trị của một thuộc tính trong hàng.
    - `editRowFields(rowIdx: number, fields: Record<string, any>)`: Chỉnh sửa đồng thời nhiều thuộc tính của một hàng.
    - `setAll(rows: T[])`: Gán đè toàn bộ danh sách dữ liệu bằng mảng mới.

#### 4. `ModelContext` ([src/contexts/modelContext.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/contexts/modelContext.tsx))

Quản lý các trạng thái tương tác chọn vị trí điểm, tạo đường nối và kéo thả di chuyển đối tượng trên giao diện mô hình 3D.

- **States**:
  - `pickMode: PickMode`: Chế độ nhấp chọn điểm hiện tại (`"hotspot" | "tourspot" | "edge" | null`).
  - `edgeFirstId: string | null`: ID của Hotspot thứ nhất được chọn khi tạo đoạn nối Edge.
  - `pendingRow: PendingRow | null`: Lưu thông tin hàng dữ liệu chờ tạo sau khi người dùng nhấp vị trí trên 3D (mở `NewRowDialog`).
  - `movingItem: { type: "hotspot" | "tourspot"; id: string } | null`: Đối tượng điểm 3D đang được chọn để kéo thả di chuyển.
  - `tempPosNormal: { position: [number, number, number]; normal: [number, number, number] } | null`: Tọa độ 3D tạm thời của điểm đang kéo thả.
  - `showTourspots: boolean`: Bật/tắt hiển thị các điểm Tourspot trên không gian 3D.
  - `tourspotSceneId: string | null`: ID của TourScene liên kết với Tourspot sắp tạo.
- **Functions**:
  - `startPicking(mode: PickMode)`: Bắt đầu kích hoạt chế độ nhấp chọn vị trí 3D.
  - `cancelPicking()`: Hủy bỏ chế độ nhấp chọn vị trí.
  - `submitHotspotPick(position, normal)`: Lưu tọa độ nhấp chọn cho Hotspot 3D và chuẩn bị `pendingRow`.
  - `submitTourspotPick(position, normal)`: Lưu tọa độ nhấp chọn cho Tourspot 3D và chuẩn bị `pendingRow`.
  - `submitEdgeHotspotClick(hotspotId: string)`: Xử lý nhấp chọn lần lượt 2 Hotspot để tạo đoạn nối Edge.
  - `clearPendingRow()`: Đặt lại `pendingRow = null` sau khi đóng dialog.
  - `setMovingItem(...)`, `setTempPosNormal(...)`, `setShowTourspots(...)`, `setTourspotSceneId(...)`: Các hàm setter tương ứng.

#### 5. `FloorContext` ([src/contexts/floorContext.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/contexts/floorContext.tsx))

Quản lý trạng thái bộ lọc sơ đồ và phạm vi ô phòng trong màn hình xem sơ đồ tầng (`FloorPreview`).

- **States**:
  - `building: string`: Mã tòa nhà đang xem (mặc định `"cA"`).
  - `floor: string`: Tầng đang xem (mặc định `"1"`).
  - `roomId: string`: Mã phòng đang chọn để biên tập.
  - `colsFrom: string`, `colsTo: string`: Phạm vi ô cột [từ - đến] trên sơ đồ lưới.
  - `rowsFrom: string`, `rowsTo: string`: Phạm vi ô hàng [từ - đến] trên sơ đồ lưới.
- **Functions**:
  - Cung cấp đầy đủ các hàm setter state: `setBuilding`, `setFloor`, `setRoomId`, `setColsFrom`, `setColsTo`, `setRowsFrom`, `setRowsTo`.

#### 6. `PanoContext` ([src/contexts/panoContext.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/contexts/panoContext.tsx))

Quản lý trạng thái xem và biên tập ảnh toàn cảnh 360 Panorama (Marzipano).

- **States**:
  - `currentSceneId: string`: ID của cảnh panorama 360 đang hiển thị.
  - `currentScene: TourScene | undefined`: Đối tượng dữ liệu chi tiết của cảnh hiện tại.
  - `tourScenes: TourScene[]`: Mảng danh sách tất cả các cảnh panorama khả thi.
  - `isReady: boolean`: Đánh giá xem viewer Marzipano đã sẵn sàng render hay chưa.
  - `isAddingLinkSpot: boolean`: Cờ bật chế độ chọn vị trí để thêm điểm liên kết cảnh mới (`LinkHotspot`).
  - `pendingLinkSpot: { yaw: number; pitch: number } | null`: Tọa độ góc quay (`yaw`, `pitch`) của điểm liên kết vừa nhấp chọn.
  - `relocatingIndex: number | null`: Chỉ số của điểm liên kết đang trong chế độ di chuyển vị trí.
  - `changingSceneIndex: number | null`: Chỉ số của điểm liên kết đang trong chế độ đổi cảnh đích.
- **Functions**:
  - `setScene(sceneId: string)`: Chuyển sang xem cảnh 360 có ID chỉ định.
  - `nextScene()`, `prevScene()`: Chuyển sang cảnh tiếp theo hoặc cảnh trước đó trong mảng.
  - `registerScenes(scenes: Map<string, MarzipanoScene>)`: Đăng ký bản đồ đối tượng `MarzipanoScene` với context.
  - `clearScenes()`: Dọn dẹp danh sách đối tượng scene đã đăng ký.
  - `getScene(id: string)`: Lấy đối tượng `MarzipanoScene` theo ID.
  - `startAddingLinkSpot()`, `cancelAddingLinkSpot()`: Bật / Hủy chế độ thêm điểm liên kết.
  - `setPendingLinkSpot(pos)`: Ghi nhận tọa độ góc quay cho điểm liên kết mới.
  - `startRelocating(index)`, `cancelRelocating()`: Bật / Hủy chế độ di chuyển điểm liên kết.
  - `startChangingScene(index)`, `cancelChangingScene()`: Bật / Hủy chế độ đổi cảnh mục tiêu cho điểm liên kết.

---

### Supporting components

Các thành phần giao diện UI dùng chung nằm trong thư mục `@/src/components/ui` ([src/components/ui](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui)):

#### 1. [Button.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/Button.tsx)

Nút bấm tiêu chuẩn hệ thống với thiết kế Tailwind CSS hiện đại.

- **Props**: `children`, `variant` (`"primary" | "secondary" | "danger" | "ghost"`), `icon`, `className`, và các thuộc tính `button` HTML tiêu chuẩn.
- **Chức năng**: Đóng gói các lớp kiểu dáng hover, active, focus, disabled và hiệu ứng scale mượt mà khi người dùng thao tác.

#### 2. [Dialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/Dialog.tsx)

Hộp thoại Modal dùng chung, hỗ trợ cả hai chế độ Controlled (do component cha quản lý `isOpen`) và Uncontrolled (kích hoạt qua nút `trigger`).

- **Props**: `trigger`, `title`, `children`, `widthClass`, `isOpen`, `onClose`.
- **Chức năng**: Hiển thị lớp phủ mờ nền (backdrop), hộp thoại nổi trung tâm, thanh tiêu đề có nút đóng (`X`), tự động đóng khi click ra ngoài backdrop.

#### 3. [EditCellDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/EditCellDialog.tsx)

Modal chỉnh sửa giá trị của một ô dữ liệu trong bảng `Table`.

- **Props**: `dataId: DataId`, `attribute: string | null`, `rowIdx: number | null`, `onClose: () => void`.
- **Chức năng**: Đọc thông tin thuộc tính và dòng dữ liệu từ `DataContext`, hiển thị trình nhập liệu tương ứng [FieldEditor.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/FieldEditor.tsx), tiến hành kiểm tra tính hợp lệ dữ liệu (bắt buộc, mảng cố định, khóa chính duy nhất) trước khi gọi `editRow()`.

#### 4. [FieldEditor.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/FieldEditor.tsx)

Trình nhập liệu thông minh thích ứng theo quy tắc dữ liệu `TableRule`.

- **Props**: `rule: TableRule`, `value: any`, `onChange: (value: any) => void`.
- **Chức năng**:
  - Render thẻ `<select>` nếu thuộc tính định nghĩa danh sách các giá trị hợp lệ (`rule.values`).
  - Render danh sách các ô `<input>` động có nút thêm/xóa nếu thuộc tính thuộc dạng mảng (`rule.type === "arr"`).
  - Render thẻ `<textarea>` hoặc `<input>` nhập liệu mặc định.

#### 5. [NewRowDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/NewRowDialog.tsx)

Modal tạo và thêm một hàng dữ liệu mới cho tập dữ liệu bất kỳ.

- **Props**: `dataId: DataId`, `isOpen: boolean`, `onClose: () => void`, `onSuccess?`, `initialValues?`.
- **Chức năng**: Duyệt danh sách các thuộc tính hiển thị (`visibleRules`), nạp giá trị ban đầu từ `initialValues`, hiển thị form nhập liệu, thực hiện kiểm tra validation toàn diện và gọi `addRow()` để thêm dữ liệu vào context.

#### 6. [UploadJsonDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/UploadJsonDialog.tsx)

Modal cho phép dán nội dung văn bản JSON hoặc chọn tệp `.json` từ máy tính.

- **Props**: `dataId: DataId`, `isOpen: boolean`, `onClose: () => void`, `onParsed: (rows, rawRows) => void`.
- **Chức năng**: Đọc dữ liệu từ file/văn bản dán, phân tích cú pháp JSON bằng `tryJsonToObject`, kiểm tra lỗi cú pháp và chuyển danh sách dòng dữ liệu sang bước xem trước [UploadPreviewDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/UploadPreviewDialog.tsx).

#### 7. [UploadPreviewDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/UploadPreviewDialog.tsx)

Modal xem trước danh sách dữ liệu sắp được thêm hoặc ghi đè từ file import.

- **Props**: `isOpen: boolean`, `onClose: () => void`, `rows: UploadPreviewRow[]`, `onConfirm`, `error`.
- **Chức năng**: Hiển thị bảng danh sách các mục phân biệt bằng nhãn màu (Màu xanh: "New" - tạo mới, Màu cam: "Will overwrite" - ghi đè), cho phép chọn/bỏ chọn từng mục hoặc tất cả trước khi xác nhận lưu.

#### 8. [UploadZipDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/UploadZipDialog.tsx)

Modal tải lên tệp nén `.zip` chứa thư mục dự án tour 360 panorama.

- **Props**: `isOpen: boolean`, `onClose: () => void`, `onParsed`.
- **Chức năng**: Sử dụng thư viện `JSZip` giải nén tệp `.zip`, trích xuất đối tượng `APP_DATA.scenes` từ `data.js`, thu thập các gạch ảnh trong thư mục `/tiles` và đăng ký Blob URL với [tileRegistry.ts](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/lib/utils/tileRegistry.ts) để xem trước trực tiếp.

---

### Main components

Các thành phần giao diện chính nằm trong thư mục `@/src/components/main` ([src/components/main](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main)):

#### 1. [Login.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Login.tsx)

Màn hình xác thực đăng nhập người dùng vào ứng dụng.

- **Chức năng**: Hiển thị form nhập Tên tài khoản và Mật khẩu. Khi gửi form sẽ kích hoạt hàm `login(name)` từ `UserContext` để chuyển trạng thái sang giao diện làm việc Workspace.

#### 2. [RightBar.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/RightBar.tsx)

Thanh điều hướng danh mục nằm ở cạnh phải giao diện.

- **Chức năng**: Hiển thị logo ứng dụng "UIT iMap Manager" và danh sách 8 tab chức năng (Model Preview, Floor Preview, Hotspots, Edges, Rooms, Tourspots, Scenes Preview, Transport) kèm biểu tượng Lucide. Khi click vào tab nào sẽ gọi `setTab(id)` để đổi view màn hình trung tâm.

#### 3. [Topbar.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Topbar.tsx)

Thanh công cụ tác vụ ở phía trên màn hình, linh hoạt biến đổi giao diện theo tab active.

- **Chức năng**:
  - _Ở các Tab Bảng Dữ Liệu_: Hiển thị nút "Add Row" (Thêm dòng), "Upload JSON" / "Upload zip/folder" (Tải tệp dữ liệu lên), "Download JSON" (Xuất dữ liệu tệp JSON), "Save" (Lưu dữ liệu).
  - _Ở Tab `model`_: Hiển thị các nút "Add Hotspot", "Add Tourspot" (kèm menu chọn scene), "Add Edge" và nút "Cancel" hủy chọn điểm.
  - _Ở Tab `floorPreview`_: Hiển thị bộ chọn Tòa nhà (`Building`), Tầng (`Floor`), thông tin mã phòng đang chọn và ô xem nhanh mã `Room ID`.
  - _Ở Tab `tourScenes`_: Hiển thị các nút "Add linking spot", "Update panorama", "Upload panorama" (hiển thị popup tiến trình cắt gạch ảnh 360 theo thời gian thực), và "Download JSON".

#### 4. [Table.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Table.tsx)

Bảng dữ liệu tương tác thông minh dành cho các tập dữ liệu `hotspots`, `rooms`, `edges`, `tourspots`, `transport`.

- **Chức năng**: Sử dụng thư viện `@tanstack/react-table` render bảng dữ liệu đa năng:
  - Ô tìm kiếm từ khóa toàn cục (Global Search Filter).
  - Sắp xếp tăng/giảm theo cột khi click vào tiêu đề cột.
  - Double-click vào ô để bật [EditCellDialog.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/ui/EditCellDialog.tsx) chỉnh sửa giá trị.
  - Nút "Remove" ở mỗi dòng để xóa dữ liệu với hộp thoại xác nhận.

#### 5. [FloorPreview.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/FloorPreview.tsx)

Màn hình xem trước và biên tập sơ đồ bố trí phòng 2D theo tầng.

- **Chức năng**:
  - Lọc danh sách phòng theo tòa nhà (`building`) và tầng (`floor`) được chọn từ `FloorContext`.
  - Tự động tính toán kích thước ô lưới `CELL_SIZE` và dựng sơ đồ theo bố cục CSS Grid linh hoạt.
  - Phân loại màu sắc phòng học/chức năng sinh động dựa trên `CATEGORY_COLORS`.
  - Click trực tiếp vào phòng trên sơ đồ để điều chỉnh phạm vi ô cột `cols` [từ - đến] và ô hàng `rows` [từ - đến].
  - Hiển thị vị trí xem trước nét đứt kèm hiệu ứng animation khi nhập tọa độ phòng mới trước khi bấm nút "Add".

#### 6. [Shortcuts.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/Shortcuts.tsx)

Component quản lý các phím tắt bàn phím trong ứng dụng (hiện đang trả về `null` chờ mở rộng).

#### 7. [model/ModelViewer.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/model/ModelViewer.tsx)

Trình xem và tương tác với mô hình 3D tòa nhà công trình (`map.glb`).

- **Chức năng**: Sử dụng Web Component `<model-viewer>` (`@google/model-viewer`):
  - Tải mô hình 3D GLB, cho phép điều khiển xoay 360 độ, phóng to/thu nhỏ camera.
  - Bảng công tắc bật/tắt hiển thị: Hotspots (nút điểm đỏ), Tourspots (nút điểm xanh dương), Edges (các đường nối SVG màu xanh lá giữa 2 hotspot).
  - Bắt sự kiện click di chuột trên bề mặt 3D, sử dụng API `positionAndNormalFromPoint` tính toán tọa độ 3D thực tế `[x, y, z]` và Vector pháp tuyến.
  - Hỗ trợ chế độ di chuyển kéo thả điểm 3D (Drag to relocate): theo dõi sự kiện di chuột `mousemove` trong không gian 3D và cập nhật vị trí mới khi click thả chuột.

#### 8. [tour/ScenesPreview.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/tour/ScenesPreview.tsx)

Component container bao bọc bộ xem panorama 360 cho tab `tourScenes`.

- **Chức năng**: Kết nối `PanoContext` với [TourViewer.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/tour/TourViewer.tsx), tự động chọn cảnh hiện tại hoặc cảnh đầu tiên trong danh sách để trình chiếu.

#### 9. [tour/TourViewer.tsx](file:///d:/PROJECT/uit-imap-project/uit-imap-manager/src/components/main/tour/TourViewer.tsx)

Trình chiếu và biên tập ảnh toàn cảnh 360 Panorama chuyên sâu.

- **Chức năng**:
  - Nhúng engine `Marzipano` render Cubemap tiles panorama.
  - Sidebar danh sách các cảnh (Scenes List) phía bên trái: cho phép đổi tên trực tiếp (double-click), thay đổi thứ tự sắp xếp (nút Up/Down) và xóa cảnh khỏi tour.
  - Hiển thị các nút điểm liên kết cảnh (`LinkHotspot`): rê chuột hiển thị menu nhỏ hỗ trợ: Đổi vị trí 360 (`Relocate`), Đổi cảnh đích (`Change Scene`), Xoay hướng chỉ mũi tên (từ `0°` đến `270°`), và Xóa điểm liên kết (`Remove`).
  - Cho phép nhấp chọn trực tiếp trên ảnh panorama 360 để chọn vị trí góc `yaw` & `pitch` khi tạo điểm liên kết mới hoặc điều chỉnh vị trí điểm sẵn có.
