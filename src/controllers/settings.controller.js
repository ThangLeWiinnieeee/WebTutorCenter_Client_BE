const sanitizeHtml = require("sanitize-html");
const Settings = require("../models/settings.model");
const { successResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const DEFAULT_CONTRACT_HTML = `
<h1 style="text-align:center">HỢP ĐỒNG GIAO ( NHẬN ) LỚP</h1>
<p style="text-align:center"><em>Lưu ý: Vui lòng đọc kỹ các Điều khoản dưới đây</em></p>
<p>Hôm nay, ngày ........ tháng ........ năm ........</p>
<h3>Bên A</h3>
<p><strong>Họ và tên:</strong> Nguyễn Văn An</p>
<p><strong>Địa chỉ:</strong> {{address}}</p>
<p><strong>Email:</strong> {{email}}</p>
<p><strong>Đại diện cho trung tâm gia sư:</strong> Trung tâm Gia sư</p>
<h3>Bên B</h3>
<p><strong>Họ và tên:</strong> ............................................................</p>
<p><strong>Năm sinh:</strong> ........................</p>
<p><strong>Nghề nghiệp:</strong> ............................................................</p>
<p><strong>Điện thoại:</strong> ............................................................</p>
<p><strong>Địa chỉ thường trú:</strong> ............................................................</p>
<p><strong>Sẽ là người có trách nhiệm giảng dạy lớp mã số:</strong> {{classCode}}</p>
<p>Chúng tôi thoả thuận ký kết HỢP ĐỒNG GIAO (NHẬN) LỚP và cam kết làm đúng những điều khoản sau đây:</p>
<p>Vì quyền lợi và uy tín lâu dài của cả hai bên, kính mong Giáo Viên, Sinh Viên đọc kỹ hợp đồng này trước khi nhận lớp.</p>
<h2>CÁC HÌNH THỨC NHẬN LỚP</h2>
<ol>
  <li>Gia sư đến trực tiếp văn phòng Trung tâm Gia sư tại địa chỉ: {{address}} để ký hợp đồng, đóng phí nhận lớp và nhận giấy giới thiệu trực tiếp.</li>
  <li>Gia sư nhận lớp qua hình thức online. Gia sư sẽ gửi phí nhận lớp qua các tài khoản ngân hàng của trung tâm cung cấp. Giấy giới thiệu và hợp đồng sẽ được gửi qua tài khoản gia sư tại website WebTutorCenter.</li>
</ol>
<p>Gia sư nhận lớp qua một trong hai hình thức trên đều sẽ chấp hành theo các điều khoản của hợp đồng giao (nhận) lớp dưới đây:</p>
<h2>Bên B : Phía gia sư</h2>
<p><strong>Điều 1:</strong> Gia sư khi nhận lớp sẽ đóng phí trước khi nhận lớp cho trung tâm khoản phí như sau:</p>
<ul>
  <li>Đóng 25% của học phí tháng đầu tiên đối với các môn năng khiếu, nghệ thuật, thể thao, ngoại ngữ, tin học, giáo dục trẻ đặc biệt.</li>
  <li>Đóng 25 - 30% của học phí tháng đầu tiên đối với các môn học văn hóa từ cấp tiểu học đến THPT (toán, lý, hóa, sinh, văn, tiểu học …).</li>
</ul>
<p><strong>Điều 2:</strong> Khi đến gặp phụ huynh, Bên B vui lòng xuất trình với phụ huynh Giấy giới thiệu (bắt buộc).</p>
<p><strong>Điều 3:</strong> Sau khi trung tâm cung cấp số điện thoại và địa chỉ của phụ huynh – học viên, Bên B phải alo hẹn gặp ngay. Khi gặp sự cố (vì bất cứ lý do gì mà không tiến hành học: không dạy ngay, lùi ngày học, hay bất kỳ một lý do nào dù nhỏ nhất) phải báo cho Bên A khi bạn đang ở nhà phụ huynh hoặc vừa ra khỏi nhà phụ huynh. Các bạn gọi theo số điện thoại này từ Thứ 2 - Chủ nhật 24/24: {{hotlineList}}.</p>
<p><strong>Điều 4:</strong> Bên B phải có trách nhiệm giữ lại Phiếu thu của ngân hàng cẩn thận, nếu có sự cố xảy ra chúng sẽ là chứng từ để trung tâm giải quyết hoàn phí.</p>
<p><strong>Điều 5:</strong> Sau 1 tháng đầu tiên, hợp đồng này chấm dứt. Nếu trong tháng đầu lỗi do phụ huynh học viên, trung tâm sẽ giải quyết cho gia sư dựa vào từ thời điểm nhận lớp đến thời điểm gia sư báo sự cố.</p>
<h2>Bên A : Phía trung tâm gia sư Trung tâm Gia sư</h2>
<p><strong>Điều 6:</strong> Sau khi nhận phí Bên A sẽ cung cấp địa chỉ, số điện thoại của PHHS trên giấy giới thiệu và gọi điện báo thông tin của Bên B cho Phụ huynh.</p>
<p><strong>Điều 7:</strong> Tùy theo từng trường hợp cụ thể Bên A sẽ giải quyết hoàn phí như sau:</p>
<ol>
  <li>Nếu Phụ Huynh không cho con học, học viên không học (Trung tâm sẽ cử người xác minh thông tin trong vòng từ 2 đến 7 ngày): <strong>Bên A hoàn lại 100% phí.</strong></li>
  <li>Nếu Bên B dạy không đạt, học sinh không hiểu hoặc các trường hợp gia sư thiếu trách nhiệm (chỉ áp dụng khi chưa nhận lương): <strong>Bên A thu 10% của học phí.</strong></li>
  <li>Nếu Bên B thay đổi bất kỳ điều khoản ban đầu (phụ huynh đồng ý mà Bên B không dạy, đi trễ về sớm, hẹn phụ huynh mà không đến đúng hẹn, tự ý đổi lịch hẹn, lấy lý do xa quá, tăng lương, đau ốm, trả lớp, tự ý thương lượng mức lương, tăng số buổi dạy, tăng số học sinh, không liên hệ phụ huynh ngay hoặc dạy vài buổi đòi phụ huynh đóng tiền):
    <ul>
      <li>Vi phạm Điều 2 hoặc Điều 3 của hợp đồng.</li>
      <li>Nói không đúng sự thật.</li>
      <li>Báo với phụ huynh đóng phí nhận lớp cho trung tâm.</li>
    </ul>
    <strong>Bên A không hoàn trả phí.</strong>
  </li>
</ol>
<p style="text-align:center"><strong>Bên B</strong><br><em>(Chữ ký bên B)</em></p>
<p style="text-align:center"><strong>Bên A</strong><br><em>(Chữ ký bên A)</em></p>
`.trim();

const DEFAULT_FOOTER = {
  address: "54 Nguyễn Lương Bằng, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng",
  phone: "093 143 9203",
  phone2: "",
  email: "contact@webtutor.vn",
  facebookLink: "https://facebook.com/webtutor",
  zaloLink: "https://zalo.me/0931439203",
  instagramLink: "",
  twitterLink: "",
  contractHtml: DEFAULT_CONTRACT_HTML,
};

const PHONE_PATTERN = /^[+\d][\d\s().-]{7,19}$/;
const trimOptional = (value) => (typeof value === "string" ? value.trim() : "");

const sanitizeContractHtml = (html) =>
  sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "p",
      "div",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
    ],
    allowedAttributes: {
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      p: ["style"],
      div: ["style"],
      blockquote: ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|center|right|justify)$/],
      },
    },
  });

const findOrCreateFooter = async () => {
  let footer;

  try {
    footer = await Settings.findOneAndUpdate(
      { key: "footer" },
      { $setOnInsert: { value: DEFAULT_FOOTER } },
      { upsert: true, new: true }
    );
  } catch (error) {
    if (error.code !== 11000 && !error.message.includes("E11000")) throw error;
    footer = await Settings.findOne({ key: "footer" });
  }

  if (!footer) return { value: DEFAULT_FOOTER };

  const mergedValue = { ...DEFAULT_FOOTER, ...footer.value };
  const needsBackfill = Object.keys(DEFAULT_FOOTER).some((key) => footer.value?.[key] === undefined);

  if (needsBackfill) {
    footer.value = mergedValue;
    footer.markModified("value");
    await footer.save();
  }

  return footer;
};

// Lấy cấu hình công khai dùng chung cho footer, hotline và hợp đồng mẫu.
const getFooterSettings = async (req, res, next) => {
  try {
    const footer = await findOrCreateFooter();

    return successResponse(res, {
      message: MESSAGE.SETTINGS_FOOTER_GET_SUCCESS,
      data: footer.value,
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật cấu hình công khai; các field mới được giữ nguyên nếu client cũ không gửi lên.
const updateFooterSettings = async (req, res, next) => {
  try {
    const payload = req.body || {};

    if (
      typeof payload.address !== "string" ||
      typeof payload.phone !== "string" ||
      typeof payload.email !== "string" ||
      !payload.address.trim() ||
      !payload.phone.trim() ||
      !payload.email.trim()
    ) {
      throw new AppError(MESSAGE.SETTINGS_FOOTER_REQUIRED, HTTP_STATUS.BAD_REQUEST);
    }

    const phone = payload.phone.trim();
    if (payload.phone2 !== undefined && typeof payload.phone2 !== "string") {
      throw new AppError("Số điện thoại hotline không hợp lệ", HTTP_STATUS.BAD_REQUEST);
    }
    const phone2 = (payload.phone2 || "").trim();
    if (!PHONE_PATTERN.test(phone) || (phone2 && !PHONE_PATTERN.test(phone2))) {
      throw new AppError("Số điện thoại hotline không hợp lệ", HTTP_STATUS.BAD_REQUEST);
    }

    if (payload.contractHtml !== undefined && typeof payload.contractHtml !== "string") {
      throw new AppError("Nội dung hợp đồng mẫu không hợp lệ", HTTP_STATUS.BAD_REQUEST);
    }

    if (payload.contractHtml && payload.contractHtml.length > 100000) {
      throw new AppError("Nội dung hợp đồng không được vượt quá 100.000 ký tự", HTTP_STATUS.BAD_REQUEST);
    }

    const current = await findOrCreateFooter();
    const contractHtml =
      payload.contractHtml !== undefined ? sanitizeContractHtml(payload.contractHtml) : current.value.contractHtml;
    if (!contractHtml.trim()) {
      throw new AppError("Nội dung hợp đồng mẫu không được để trống", HTTP_STATUS.BAD_REQUEST);
    }

    const value = {
      ...DEFAULT_FOOTER,
      ...current.value,
      address: payload.address.trim(),
      phone,
      email: payload.email.trim(),
      facebookLink: trimOptional(payload.facebookLink),
      zaloLink: trimOptional(payload.zaloLink),
      instagramLink: trimOptional(payload.instagramLink),
      twitterLink: trimOptional(payload.twitterLink),
      ...(payload.phone2 !== undefined ? { phone2 } : {}),
      contractHtml,
    };

    const footer = await Settings.findOneAndUpdate(
      { key: "footer" },
      { value },
      { upsert: true, new: true }
    );

    return successResponse(res, {
      message: MESSAGE.SETTINGS_FOOTER_UPDATE_SUCCESS,
      data: footer.value,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFooterSettings,
  updateFooterSettings,
  sanitizeContractHtml,
};
