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

  const subjectAndMajor_Major = require("./dashboard/subject_and_time/major/route");
  subjectAndMajor_Major(prop);



  
  const subjectAndMajor_Subject = require("./dashboard/subject_and_time/subject/route");
  subjectAndMajor_Subject(prop);

  const studentMGTStudent = require("./dashboard/student_mgt/student/route");
  studentMGTStudent(prop);
  
  
  const buidlingMGT_Building = require("./dashboard/building/building/route");
  buidlingMGT_Building(prop);


  const buidlingMGT_Floor = require("./dashboard/building/floor/route");
  buidlingMGT_Floor(prop);


    const buidlingMGT_Room = require("./dashboard/building/room/route");
  buidlingMGT_Room(prop);


  const teactherMGTStudent = require("./dashboard/student_mgt/teacher/route");
  teactherMGTStudent(prop);
};

module.exports = index;
