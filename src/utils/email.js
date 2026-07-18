const { OAuth2Client } = require("google-auth-library");

// Gửi email qua Gmail API (HTTPS 443) thay vì SMTP để tránh bị hosting chặn cổng SMTP
const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);
oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

// Địa chỉ gửi hiển thị; phần email phải là tài khoản Gmail đã cấp quyền (GMAIL_USER).
const FROM_ADDRESS = process.env.EMAIL_FROM || `WebTutorCenter <${process.env.GMAIL_USER}>`;

// Escape HTML để chống XSS trong nội dung email
const HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);

// Dựng message RFC 2822 rồi mã hóa base64url theo yêu cầu của Gmail API.
const _buildRawMessage = ({ from, to, subject, html }) => {
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subjectEncoded}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html, "utf-8").toString("base64"),
  ].join("\r\n");

  return Buffer.from(message, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// oAuth2Client tự dùng refresh_token để lấy access_token mới; lỗi sẽ throw cho service/controller xử lý.
const _send = async ({ to, subject, html }) => {
  const raw = _buildRawMessage({ from: FROM_ADDRESS, to, subject, html });
  await oAuth2Client.request({
    url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    method: "POST",
    data: { raw },
  });
};

// Gửi email chứa mã OTP xác thực đăng ký
const sendOtpEmail = async ({ to, fullName, otp, expiresInMinutes }) => {
  await _send({
    to,
    subject: "Xác thực email - Mã OTP của bạn",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1d4ed8; margin-bottom: 4px;">WebTutorCenter</h2>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin-bottom: 20px;" />

        <p style="font-size: 15px; color: #374151;">Xin chào <strong>${escapeHtml(fullName)}</strong>,</p>
        <p style="font-size: 15px; color: #374151;">
          Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã OTP dưới đây để xác thực email:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <span style="
            display: inline-block;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 12px;
            color: #1d4ed8;
            background: #eff6ff;
            padding: 16px 32px;
            border-radius: 8px;
            border: 1px dashed #93c5fd;
          ">${otp}</span>
        </div>

        <p style="font-size: 14px; color: #6b7280;">
          Mã OTP có hiệu lực trong <strong>${expiresInMinutes} phút</strong>. Không chia sẻ mã này với bất kỳ ai.
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 24px;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          © ${new Date().getFullYear()} WebTutorCenter. All rights reserved.
        </p>
      </div>
    `,
  });
};

// Gửi email chứa mã OTP khôi phục mật khẩu
const sendForgotPasswordOtpEmail = async ({ to, fullName, otp, expiresInMinutes }) => {
  await _send({
    to,
    subject: "Khôi phục mật khẩu - Mã OTP của bạn",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #dc2626; margin-bottom: 4px;">WebTutorCenter</h2>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin-bottom: 20px;" />

        <p style="font-size: 15px; color: #374151;">Xin chào <strong>${escapeHtml(fullName)}</strong>,</p>
        <p style="font-size: 15px; color: #374151;">
          Chúng tôi nhận được yêu cầu <strong>khôi phục mật khẩu</strong> cho tài khoản của bạn.
          Vui lòng sử dụng mã OTP dưới đây:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <span style="
            display: inline-block;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 12px;
            color: #dc2626;
            background: #fef2f2;
            padding: 16px 32px;
            border-radius: 8px;
            border: 1px dashed #fca5a5;
          ">${otp}</span>
        </div>

        <p style="font-size: 14px; color: #6b7280;">
          Mã OTP có hiệu lực trong <strong>${expiresInMinutes} phút</strong>. Không chia sẻ mã này với bất kỳ ai.
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 24px;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          © ${new Date().getFullYear()} WebTutorCenter. All rights reserved.
        </p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail, sendForgotPasswordOtpEmail, escapeHtml };
