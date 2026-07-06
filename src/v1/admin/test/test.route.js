const baseRoute = "test";
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

// ============ EMAIL CONFIGURATION ============
const emailTest = "penvisamef@gmail.com";
const passTest = "theqpbetxvjvtaic";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailTest,
    pass: passTest,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter ready");
  }
});

// ============ WECHAT CONFIGURATION ============
const wechatConfig = {
  appid: "wxa6dc326fa0d7420c",
  appsecret: "ad3ea7614906ed13a9b8714ea937e47e",
};

// Store openid mappings (in production, use database)
const openidStore = new Map(); // registration_code -> openid

// Helper: Get WeChat access token
async function getWeChatAccessToken() {
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${wechatConfig.appid}&secret=${wechatConfig.appsecret}`,
  );
  const data = await response.json();
  if (data.errcode)
    throw new Error(`Failed to get access_token: ${data.errmsg}`);
  return data.access_token;
}

// Helper: Send template message
async function sendWeChatTemplateMessage(openid, registration_code, fullname) {
  try {
    const accessToken = await getWeChatAccessToken();

    // ✅ UPDATED: Your NEW template ID from FamTripPKS
    const templateId = "O9AgCh05ANErgDpsPyi9c5OUmwLpP7L0ItjPfyb-7vY";

    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          touser: openid,
          template_id: templateId,
          data: {
            first: {
              value: `Dear ${fullname}, your registration is confirmed! 🎉`,
              color: "#173177",
            },
            keyword1: {
              value: registration_code,
              color: "#ff6600",
            },
            keyword2: {
              value: "March 26-28, 2026",
              color: "#173177",
            },
            remark: {
              value: "Please show this code at check-in",
              color: "#999999",
            },
          },
        }),
      },
    );

    const result = await response.json();
    console.log("WeChat API Response:", JSON.stringify(result, null, 2));

    if (result.errcode) {
      return { success: false, error: result.errmsg, errcode: result.errcode };
    }
    return { success: true, messageId: result.msgid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ============ ROUTE 1: SEND EMAIL ============
  prop.app.post(
    `${urlAPI}/gmail`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { fullname, registration_code } = req.body;

        if (!fullname || !registration_code) {
          return res.status(400).json({
            success: false,
            error: "fullname and registration_code are required",
          });
        }

        const userEmail =
          req.body.email || req.user?.email || "penvisamef@gmail.com";

        const qrCodeBuffer = await QRCode.toBuffer(
          JSON.stringify({
            registration_code: registration_code,
            fullname: fullname,
          }),
        );

        const info = await transporter.sendMail({
          from: `"Event Team" <${emailTest}>`,
          to: userEmail,
          subject: "🎫 Event Registration Confirmation",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h2 style="color: white;">Registration Confirmed! 🎉</h2>
              </div>
              <div style="background: #f9fafb; padding: 30px;">
                <h3>Dear ${fullname},</h3>
                <p>Thank you for registering!</p>
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background: linear-gradient(135deg, #f5f7fa 0%, #e8edf5 100%); padding: 30px; border-radius: 20px; border: 2px solid #667eea;">
                    <div style="font-size: 12px; color: #667eea;">YOUR REGISTRATION CODE</div>
                    <div style="font-size: 32px; font-weight: 800; font-family: monospace;">${registration_code}</div>
                  </div>
                </div>
                <p><strong>📅 Event:</strong> March 26-28, 2026</p>
                <p><strong>📍 Location:</strong> Conference Hall, City Center</p>
              </div>
            </div>
          `,
          attachments: [{ filename: "qrcode.png", content: qrCodeBuffer }],
        });

        res.json({
          success: true,
          message: "Email sent successfully",
          messageId: info.messageId,
          registration_code: registration_code,
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
  );

  // ============ ROUTE 2: SEND WECHAT ============
  prop.app.post(
    `${urlAPI}/wechat`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { fullname, registration_code, openid } = req.body;

        if (!fullname || !registration_code) {
          return res.status(400).json({
            success: false,
            error: "fullname and registration_code are required",
          });
        }

        if (!openid) {
          return res.status(400).json({
            success: false,
            error:
              "openid is required. User must follow your WeChat Official Account first.",
          });
        }

        // Store the openid for this registration code
        openidStore.set(registration_code, openid);
        console.log(`✅ Stored openid for ${registration_code}: ${openid}`);

        // Send WeChat template message
        const result = await sendWeChatTemplateMessage(
          openid,
          registration_code,
          fullname,
        );

        if (result.success) {
          res.json({
            success: true,
            message: "WeChat message sent successfully",
            registration_code: registration_code,
            openid: openid,
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.error,
            errcode: result.errcode,
            note: "Make sure you have created a template in your WeChat test account",
          });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
  );

  // GET endpoint to get openid from WeChat OAuth
  prop.app.get(`${urlAPI}/wechat/get-openid`, async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
      return res.send("No code provided. Please try again.");
    }

    try {
      const response = await fetch(
        `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${wechatConfig.appid}&secret=${wechatConfig.appsecret}&code=${code}&grant_type=authorization_code`,
      );
      const data = await response.json();

      if (data.errcode) {
        console.error("WeChat API Error:", data);
        return res.send(`Error: ${data.errmsg}`);
      }

      const userOpenId = data.openid;
      console.log(`✅ Successfully got openid for user: ${userOpenId}`);
      console.log(`   Registration code (from state): ${state}`);

      res.send(`
        <html>
        <body style="text-align:center; margin-top:100px; font-family:Arial;">
          <h2 style="color:#4CAF50;">✅ Successfully Linked!</h2>
          <p>Your WeChat is now connected. You can close this page.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Server Error:", error);
      res.send("An internal server error occurred.");
    }
  });
};

module.exports = route;
