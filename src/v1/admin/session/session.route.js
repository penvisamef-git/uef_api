const helper = require("../../../util/helper");
const User = require("../user/user.model");
const ActivityLogCategory = require("../activity_log_category/activity_log_category.model");
const ActivityLog = require("../activity_log/activity_log.model");
const Session = require("./session.model");
const baseRoute = "session";

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  prop.app.get(`${urlAPI}`, prop.api_auth, async (req, res) => {
    res.json({ success: true });
  });

  prop.app.post(`${urlAPI}`, prop.api_auth, async (req, res) => {
    const { user_id } = req.body;

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
        .json({ success: false, message: "User not found" });
    }

    // 3. Check password (plaintext example — use bcrypt in real app)
    if (user.password !== password) {
      return res.json({ success: false, message: "Invalid Password!" });
    }

    // 4. Log activity after successful login
    const categoryLog = await ActivityLogCategory.findOne({ title: "auth" });
    if (!categoryLog) {
      return res
        .status(404)
        .json({ success: false, message: "Activity log category not found" });
    }
    const log = new ActivityLog({
      title: `ឧបករណ៍ ${
        helper.extractDeviceInfo(req).device
      } បានចូលគណនី (សាអេឡិចត្រូនិច : ${email})`,
      description: `ប្រើប្រាស់ ${
        helper.extractDeviceInfo(req).browser
      } ចូលក្នុងប្រព័ន្ធ - ${helper.cambodiaDate()}`,
      activity_log_category_id: categoryLog._id,
      create_by_id: user._id,
      device: helper.extractDeviceInfo(req), // optional
      time: helper.cambodiaDate(),
    });

    await log.save();

    // 5. Return success
    const userData = user.toObject();
    delete userData.password;
    const access_token = prop.jwt.sign(
      { userName: email, user: password },
      "access_token",
      { expiresIn: "720h" }
    );
    userData.access_token = access_token;
    res.json({ success: true, data: userData });
  });
};

module.exports = route;
