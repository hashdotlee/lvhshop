-- Seed quiz questions: legendary radio models from famous brands
INSERT INTO quiz_questions (brand, model_name, description, year, difficulty, options) VALUES

-- SONY
('Sony', 'ICF-5900W',
 'Radio băng ngắn 9 băng tần huyền thoại, mặt số analog chia đôi theo chiều dọc, có đồng hồ chỉnh múi giờ thế giới và bộ lọc dải thông (BFO) cho SSB/CW. Được mệnh danh là "Vua băng ngắn" của thập niên 70, vỏ ngoài màu bạc-đen sang trọng.',
 1976, 'hard',
 ARRAY['ICF-5900W', 'ICF-7600DS', 'ICF-2010', 'TFM-8000W']),

('Sony', 'ICF-SW77',
 'Radio băng ngắn kỹ thuật số cao cấp với màn hình LCD, bộ nhớ 162 preset, hệ thống PLL đồng bộ phát hiện (Synchronous Detector), dải tần AM/FM/LW và toàn bộ băng ngắn 1.6–30MHz. Được coi là đỉnh cao kỹ thuật radio cầm tay thập niên 90.',
 1992, 'hard',
 ARRAY['ICF-SW77', 'ICF-SW7600G', 'ICF-SW55', 'ICF-SW100']),

('Sony', 'TFM-110B',
 'Radio transistor FM/AM bỏ túi kiểu dáng vuông vức, nắp trượt che loa, mặt trước có dải tần rõ ràng, màu đen hoặc bạc. Một trong những radio FM transistor ấn tượng nhất của Sony đầu thập niên 70, thường bị nhầm với máy tính bỏ túi vì thiết kế gọn đẹp.',
 1971, 'medium',
 ARRAY['TFM-110B', 'TFM-825', 'ICF-100', 'TR-6300']),

('Sony', 'ICF-6800W',
 'Radio băng ngắn 7 băng tần cao cấp, thiết kế nằm ngang (tabletop) sang trọng với mặt gỗ giả, kim chỉ tần số kiểu trung tâm, đèn chiếu sáng mặt số. Đây là model "hàng đầu phòng khách" của Sony thập niên 70, thường thấy trong nhà của giới chơi radio.',
 1975, 'hard',
 ARRAY['ICF-6800W', 'ICF-7600A', 'ICF-5800', 'CRF-5090']),

-- PANASONIC / NATIONAL
('National', 'RF-2200',
 'Radio băng ngắn 8 băng tần dạng boombox nhỏ, mặt số chia thành hai vùng riêng biệt cho AM/FM và SW, có tay cầm gập, loa to phía trước với lưới trang trí. Đây là model "đột phá" của National trong phân khúc radio gia đình thập niên 70, rất phổ biến tại Nhật và châu Á.',
 1974, 'medium',
 ARRAY['RF-2200', 'RF-4900', 'RF-1150', 'RF-3100']),

('National', 'RF-4900',
 'Radio băng ngắn 9 băng tần, thiết kế hộp chắc chắn với tay cầm xách, có đèn chỉ thị tín hiệu (signal meter) dạng kim, loa đôi stereo và anten telescopic dài. Được xem là đối thủ trực tiếp của Sony ICF-5900W, nổi tiếng về độ nhạy thu sóng ngắn.',
 1976, 'hard',
 ARRAY['RF-4900', 'RF-2200', 'RF-B65', 'RF-9000']),

('Panasonic', 'RF-B65',
 'Radio băng ngắn kỹ thuật số cầm tay với màn hình LCD hiển thị tần số, 40 preset memory, dải AM/FM/LW/SW 1.6–30MHz, thiết kế mỏng nhẹ phù hợp đi du lịch. Model rất được ưa chuộng ở Đông Nam Á vào thập niên 90.',
 1993, 'medium',
 ARRAY['RF-B65', 'RF-B45', 'RF-B11', 'RF-2200']),

-- PHILIPS
('Philips', 'L4X70T',
 'Radio băng ngắn đa năng của Philips thập niên 60, thiết kế vali nhỏ gọn, mặt số dọc ấn tượng, nhiều nút bấm lựa chọn băng tần, loa gắn mặt trước bọc vải. Là sản phẩm xuất khẩu chủ lực của Philips Hà Lan sang thị trường châu Á.',
 1965, 'hard',
 ARRAY['L4X70T', 'D2935', 'D2999', 'AE3805']),

('Philips', 'D2999',
 'Radio băng ngắn 9 băng tần cao cấp nhất của Philips, mặt số analog lớn có đèn chiếu sáng, đầu BFO cho SSB, signal meter dạng kim. Được mệnh danh là "Flagship" của Philips trong dòng radio SW thập niên 80, thiết kế sang trọng màu đen-bạc.',
 1980, 'hard',
 ARRAY['D2999', 'D2935', 'AE3805', 'D1875']),

-- GRUNDIG
('Grundig', 'Satellit 700',
 'Radio băng ngắn kỹ thuật số hàng đầu của Đức, màn hình LCD lớn hiển thị tần số và thời gian, 512 bộ nhớ preset, SSB/CW, dải tần toàn diện AM/FM/LW/SW. Là biểu tượng của kỹ thuật Đức trong ngành radio, nặng và to như một "chiếc máy trạm" cầm tay.',
 1992, 'medium',
 ARRAY['Satellit 700', 'Satellit 500', 'Satellit 800', 'Yacht Boy 400']),

('Grundig', 'Yacht Boy 400',
 'Radio băng ngắn cầm tay của Grundig, kích thước nhỏ gọn phù hợp du lịch, màn hình LCD, đủ băng tần AM/FM/LW/SW, thiết kế sang trọng màu bạc với anten xoay được. Là đối thủ cạnh tranh trực tiếp với Sony ICF-SW35 trên thị trường châu Âu.',
 1994, 'medium',
 ARRAY['Yacht Boy 400', 'Yacht Boy 500', 'Satellit 700', 'Satellit 500']),

-- ZENITH
('Zenith', 'Trans-Oceanic Royal 3000-1',
 'Radio băng ngắn nổi tiếng nhất lịch sử Mỹ, thiết kế vali da sang trọng có thể gập lại, mặt số in trên tờ bản đồ thế giới, chạy bằng pin và điện, thuộc dòng Trans-Oceanic huyền thoại. Từng là radio "tổng thống dùng" — đi theo Eisenhower và Kennedy trong các chuyến công du.',
 1963, 'hard',
 ARRAY['Trans-Oceanic Royal 3000-1', 'Trans-Oceanic H500', 'Trans-Oceanic G500', 'Royal 500']),

-- BLAUPUNKT
('Blaupunkt', 'Super 9',
 'Radio transistor 9 băng của Đức thập niên 60, thiết kế hộp chữ nhật cổ điển với màu trắng-xám và lưới loa trang trí, mặt số analog lớn chiếm toàn bộ phần trên. Blaupunkt Super 9 là biểu tượng thiết kế đầu thập niên 60, rất được giới sưu tầm radio vintage tìm mua.',
 1962, 'hard',
 ARRAY['Super 9', 'Derby', 'Galaxie', 'Riviera'])

ON CONFLICT DO NOTHING;
