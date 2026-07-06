const index = (prop) => {
  // Declaration
  prop.main_route = "api/admin";

  // All Route
  const authRoute = require("./auth/auth.route");
  authRoute(prop);
  const sessionRoute = require("./session/session.route");
  sessionRoute(prop);
  const userRoute = require("./user/user.route");
  userRoute(prop);
  const userGroupRoute = require("./user/group/group_user.route");
  userGroupRoute(prop);
  const activityLogRoute = require("./activity_log/activity_log.route");
  activityLogRoute(prop);
  const activityLogCategoryRoute = require("./activity_log_category/activity_log_category.route");
  activityLogCategoryRoute(prop);

  const subjectAndTimeSubject = require("./dashboard/subject_and_time/subject/route");
  subjectAndTimeSubject(prop);

  const studentMGTStudent = require("./dashboard/student_mgt/student/route");
  studentMGTStudent(prop);
};

module.exports = index;
