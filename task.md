- phần lọc 50 người không liên quan đến vụ án (chấm xanh) có lẽ không cần thiết, hãy bỏ luôn phần đó
- tương tự cho phép người dùng truy cập vào thông tin chi tiết của nghi phạm thông qua việc click vào chấm trên map
- các item trong grid bị mất button chọn rồi, thêm lại đi
- tôi cần chỉnh sửa AI generate mỗi lần tạo ra 50 nghi phạm sẽ có lời khai riêng trong hồ sơ: "tôi là {mối quan hệ} với {nạn nhân}, ngày hôm đó abcxyz... vào lúc {thời gian} tôi đã {thực hiện hành động}" và trong đó sẽ có sự liên kết giữa các lời khai, người chơi phải tự lọc thông tin nhiễu bằng cách suy luận tính logic về thời gian địa điểm của lời khai. hãy thiết kế màn chơi để người chơi tự tìm ra lời khai mâu thuẫn "system prompt"
- hiện tại phần lời khai và thông tin người chơi chưa có tính liên kết mạnh với phần map, trong khi luồng chính của trò chơi là lần ra chính xác vị trí hiện tại thật sự của hung thủ (tính năng chọn trên bản đồ) thông qua lời khai của các đồng phạm
- thêm role đồng phạm, nếu tìm chính xác đủ 100% đồng phạm, lời khai 2 của bọn chúng sẽ gợi ý vị trí chính xác của hung thủ, số lượng đồng phạm sẽ thay đổi ở mỗi vụ án và được thông báo từ đầu game "theo điều tra ban đầu có x đồng phạm", nếu không tìm đủ thì chỉ đạt mức "đã xác định được hung thủ nhưng không bắt giữ thành công"
- phần map hiện tại đang chia rõ ràng ai là nghi phạm ai là nhân chứng thì có vẻ không còn tính thử thách nhiễu data, cho 50 người đều chung role khi trò chơi bắt đầu, người chơi phải tự lần theo manh mối để lọc ra

tóm tắt luồng chính thức
- màn hình game start: Bắt đầu vụ án
- mở ra màn hình chính khởi động hồ sơ vụ án
- người chơi đọc manh mối sẵn có, đọc thêm lời khai lọc ra các nghi phạm, đồng phạm
- người chơi tiếp tục lấy lời khai 2 của các nhân vật được lọc ra, nếu chọn đúng hung thủ sẽ đến bước tiến hành bắt giữ, nếu chọn đúng đồng phạm thì đồng phạm nào cũng sẽ gợi ý vị trí chính xác của hung thủ, nếu chọn sai đồng phạm thì sẽ không có thông tin, nếu chọn sai hung thủ thì theo logic sẵn có, người chơi dựa theo lời khai về hint vị trí (hắn ở gần nhà thờ abcxyz), người chơi chọn một ví trí trên map, bấm đột kích(raid) thì sẽ ập vào vị trí đó kiếm hung thủ, nếu pick được cách bán kính 2km so với vị trí chính xác thì nhận thông báo tiến hành bắt giữ thành công, chúc mừng các thứ