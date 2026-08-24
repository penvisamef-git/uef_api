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

  const enrollmentMGT_NewClass = require("./dashboard/enrollment/class/route");
  enrollmentMGT_NewClass(prop);

  const enrollmentMGT_TimeTable = require("./dashboard/enrollment/time_table/route");
  enrollmentMGT_TimeTable(prop);

  const enrollmentMGT_StudentInClass = require("./dashboard/enrollment/student_in_class/route");
  enrollmentMGT_StudentInClass(prop);

  const teactherMGTStudent = require("./dashboard/student_mgt/teacher/route");
  teactherMGTStudent(prop);

  const masterDataNationlity = require("./dashboard/master_data/nationality/route");
  masterDataNationlity(prop);

  const masterDataNational = require("./dashboard/master_data/nation/route");
  masterDataNational(prop);

  const masterDataDegreeLevel = require("./dashboard/master_data/degree_level/route");
  masterDataDegreeLevel(prop);

  const masterDataYearStudy = require("./dashboard/master_data/year_study/route");
  masterDataYearStudy(prop);

  const masterDataSemester = require("./dashboard/master_data/semester/route");
  masterDataSemester(prop);

  const masterDataShift = require("./dashboard/master_data/shift/route");
  masterDataShift(prop);

  const masterDataScoreOption = require("./dashboard/master_data/score_option/route");
  masterDataScoreOption(prop);

  const areaRoute = require("./dashboard/area/area.route");
  areaRoute(prop);





  
  const addmissionAnalyticRoute = require("./dashboard/adminssion_analytic/route");
  addmissionAnalyticRoute(prop);

  // Teacher =====================================================
  const teacherAuth = require("./teacher/auth/auth.route");
  teacherAuth(prop);

  const teacherAcademic = require("./teacher/academic/route");
  teacherAcademic(prop);

  const teacherPersonnaInfo = require("./teacher/personal_info/route");
  teacherPersonnaInfo(prop);




    const attendanceLogRoute = require("./dashboard/enrollment/attendanace_log/route");
  attendanceLogRoute(prop);


  
    const departmentRoute = require("./dashboard/subject_and_time/department/route");
  departmentRoute(prop);
};

module.exports = index;
