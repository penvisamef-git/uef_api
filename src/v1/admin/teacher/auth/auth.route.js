const helper = require("../../../../util/helper");
const User = require("../../dashboard/student_mgt/teacher/model");
const baseRoute = "teacher/auth";
const { logActivity } = require("../../../../util/log");
const Session = require("../../session/session.model");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const emailTest = process.env.NODE_SEND_EMAIL;
const passTest = process.env.NODE_SEND_SECRET;
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailTest,
    pass: passTest,
  },
});
transporter.verify((error, success) => {
  if (error) {
    // console.error("❌ Email transporter error:", error);
  } else {
    //  console.log("✅ Email transporter ready");
  }
});

// Helper function to send email notification
async function sendLoginNotification(user, email, req, transporter, emailTest) {
  try {
    const info = await transporter.sendMail({
      from: `"ប្រព័ន្ធគ្រប់គ្រងសាកលវិទ្យាល័យ" <${emailTest}>`,
      to: user.email || emailTest,
      subject: "🔐 ការចូលគណនីប្រព័ន្ធ",
      html: `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #004a0f, #02a33d); padding: 30px 20px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🏛️</div>
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">ប្រព័ន្ធគ្រប់គ្រងសាកលវិទ្យាល័យ</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">សេដ្ឋកិច្ចនិងហិរញ្ញវត្ថុ</p>
      </div>
      
      <!-- Body -->
      <div style="padding: 30px 25px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 56px; margin-bottom: 10px;">🔐</div>
          <h2 style="color: #1a3c2a; margin: 0; font-size: 20px;">គណនីត្រូវបានចូល!</h2>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">អ្នកបានចូលគណនីដោយជោគជ័យ</p>
        </div>
        
        <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; border-left: 4px solid #0dc25e; margin-bottom: 20px;">
          <p style="margin: 0 0 8px 0; color: #1a3c2a; font-size: 14px;">
            <strong>👤 អ្នកប្រើប្រាស់:</strong> ${user?.firstname + " " + user?.lastname || "N/A"}
          </p>
          <p style="margin: 0 0 8px 0; color: #1a3c2a; font-size: 14px;">
            <strong>📧 អ៊ីមែល:</strong> ${user?.email || email}
          </p>
          <p style="margin: 0 0 8px 0; color: #1a3c2a; font-size: 14px;">
            <strong>🕐 ពេលវេលា:</strong> ${helper.cambodiaDate()}
          </p>
          <p style="margin: 0; color: #1a3c2a; font-size: 14px;">
            <strong>📱 ឧបករណ៍:</strong> ${helper.extractDeviceInfo(req).device} - ${helper.extractDeviceInfo(req).browser}
          </p>
        </div>
        
        <div style="background: #fef3c7; border-radius: 12px; padding: 15px 20px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            ⚠️ <strong>សូមចំណាំ:</strong> ប្រសិនបើអ្នកមិនបានចូលគណនីនេះទេ សូមទាក់ទងអ្នកគ្រប់គ្រងជាបន្ទាន់!
          </p>
        </div>
        
        <!-- Add this section to help with spam filtering -->
        <div style="text-align: center; padding: 10px; background: #f9fafb; border-radius: 8px; margin-top: 10px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            📌 អ៊ីមែលនេះផ្ញើពីប្រព័ន្ធគ្រប់គ្រងសាកលវិទ្យាល័យ
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          © 2026 ប្រព័ន្ធគ្រប់គ្រងសាកលវិទ្យាល័យសេដ្ឋកិច្ចនិងហិរញ្ញវត្ថុ
        </p>
        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px;">
          អ៊ីមែលនេះត្រូវបានផ្ញើដោយស្វ័យប្រវត្តិ សូមកុំឆ្លើយតប
        </p>
        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 10px;">
          <a href="#" style="color: #9ca3af; text-decoration: underline;">លុបឈ្មោះចេញពីបញ្ជីអ៊ីមែល</a>
        </p>
      </div>
    </div>
    `,
    });
    console.log("✅ Email sent successfully:", user.email, info.messageId);
    return true;
  } catch (emailError) {
    console.log(
      "ℹ️ Email notification skipped (daily limit or other error):",
      emailError.message,
    );
    return false;
  }
}

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  prop.app.get(
    `${urlAPI}/test-logged-in`,
    prop.api_auth,
    prop.jwt_auth,
    async (req, res) => {
      res.json({
        success: true,
        message: "API Connected : Permission and Access",
      });
    },
  );

  prop.app.post(`${urlAPI}/login`, prop.api_auth, async (req, res) => {
     const { info_email, password } = req.body;
     
        // 1. Validate required fields
        if (!info_email || !password) {
            return res.status(400).json({
                success: false,
                message: "សូមបំពេញអ៊ីមែល និងពាក្យសម្ងាត់!"
            });
        }

        // 2. Find user by email
        const userTeacher = await User.findOne({ info_email: info_email });
        if (!userTeacher) {
            return res.status(404).json({
                success: false,
                message: "គណនីមិនមានក្នុងប្រព័ន្ធ!"
            });
        } 

        var user = {
         info_email :   userTeacher.info_email,
          info_firstname_en : userTeacher.info_firstname_en,
          info_lastname_en: userTeacher.info_lastname_en,
          info_firstname_kh: userTeacher.info_firstname_kh,
          info_lastname_kh: userTeacher.info_lastname_kh,
          info_teacher_uef_id: userTeacher.info_teacher_uef_id,
          info_national_id: userTeacher.info_national_id,
          status: userTeacher.status,
          deleted: userTeacher.deleted,
          create_by: userTeacher.created_by,
          updated_by: userTeacher.updated_by,
          _id: userTeacher._id
        }








        // 3. Check if account is deleted
        if (user.deleted === true) {
            return res.status(404).json({
                success: false,
                message: "គណនីនេះត្រូវបានលុបចេញ!"
            });
        }

        // 4. Check if account is inactive
        if (user.status === false) {
            return res.status(403).json({
                success: false,
                message: "គណនីត្រូវបានផ្អាក!"
            });
        }

      



    // 4. Log activity after successful login
    await logActivity({
      title: `ឧបករណ៍ ${helper.extractDeviceInfo(req).device} បានចូលគណនី (សាអេឡិចត្រូនិច : ${info_email})`,
      description: `ប្រើប្រាស់ ${helper.extractDeviceInfo(req).browser} ចូលក្នុងប្រព័ន្ធ - ${helper.cambodiaDate()}`,
      categoryTitle: "auth",
      createdBy: user._id,
      req,
    });

    // 5. Create session
    const access_token = prop.jwt.sign(
      { userName: info_email, user: password },
      process.env.JWT_SECRET,
      { expiresIn: "720h" },
    );
    const existingSession = await Session.findOne({
      user_id: user._id,
    });

    if (existingSession) {
      existingSession.time = helper.cambodiaDate();
      existingSession.access_token = access_token;
      existingSession.device = helper.extractDeviceInfo(req);
      existingSession.user_data = user;
      await existingSession.save();
    } else {
      const session = new Session({
        user_id: user._id,
        device: helper.extractDeviceInfo(req),
        create_by: user._id,
        time: helper.cambodiaDate(),
        access_token: access_token,
        user_data: user,
      });
      await session.save();
    }

    // 6. Return success
  
   // delete userData.password;
     user.access_token = access_token;
     const newdata = user
   //  user.user_data = newdata;

    // 8. Send email notification (non-blocking)
   // sendLoginNotification(user, info_email, req, transporter, emailTest);

    res.json({
      success: true,
      data: user,
      log: {
        device: helper.extractDeviceInfo(req),
      },
    });
  });

  prop.app.post(
    `${urlAPI}/login-with-encryptpassword`,
    prop.api_auth,
    async (req, res) => {
      const { email, password } = req.body;

      // 1. Validate required fields
      const requiredFields = { email, password };
      for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
          return res.json({
            success: false,
            message: `Field '${key}' is required`,
          });
        }
      }

      // 2. Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid Username and Password!" });
      }

      // 3. Check password (plaintext comparison)
      if (user.password !== password) {
        return res.json({
          success: false,
          message: "Invalid Username and Password!",
        });
      }

      // Check if account is deleted or inactive
      if (user.deleted) {
        return res.status(404).json({
          success: false,
          message: "មិនមានអ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ!",
        });
      }

      if (!user.status) {
        return res.status(404).json({
          success: false,
          message: "គណនីត្រូវបានផ្អាក!",
        });
      }

      // 4. Log activity after successful login
      await logActivity({
        title: `ឧបករណ៍ ${helper.extractDeviceInfo(req).device} បានចូលគណនី (សាអេឡិចត្រូនិច : ${email})`,
        description: `ប្រើប្រាស់ ${helper.extractDeviceInfo(req).browser} ចូលក្នុងប្រព័ន្ធ - ${helper.cambodiaDate()}`,
        categoryTitle: "auth",
        createdBy: user._id,
        req,
      });

      // 5. Create session
      const access_token = prop.jwt.sign(
        { userName: email, user: password },
        process.env.JWT_SECRET,
        { expiresIn: "720h" },
      );
      const existingSession = await Session.findOne({
        user_id: user._id,
      });

      if (existingSession) {
        existingSession.time = helper.cambodiaDate();
        existingSession.access_token = access_token;
        existingSession.device = helper.extractDeviceInfo(req);
        existingSession.user_data = user;
        await existingSession.save();
      } else {
        const session = new Session({
          user_id: user._id,
          device: helper.extractDeviceInfo(req),
          create_by: user._id,
          time: helper.cambodiaDate(),
          access_token: access_token,
          user_data: user,
        });
        await session.save();
      }

      // // 6. Return success
      // const userData = user.toObject();
      // delete userData.password;
      // userData.access_token = access_token;
      // userData.user_data = user;

      // 7. Unit
      const unit = await unitModel.findOne({ _id: user.unit_id });
      if (unit) {
        userData.unit = unit;
      }

      // 8. Send email notification (non-blocking)
      sendLoginNotification(user, email, req, transporter, emailTest);

      res.json({
        success: true,
        data: userData,
        log: {
          device: helper.extractDeviceInfo(req),
        },
      });
    },
  );
};

module.exports = route;
