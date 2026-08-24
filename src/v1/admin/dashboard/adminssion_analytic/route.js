const mongoose = require("mongoose");
const baseRoute = "academic/analytic";
const ModelClass = require("../enrollment/class/model");
const ModelTeacher = require("../student_mgt/teacher/model");
const ModelStudent = require("../student_mgt/student/model");
const ModelShift  = require("../master_data/shift/model");
const ModelMajor  = require("../subject_and_time/major/model");
const ModelSubject  = require("../subject_and_time/subject/model");
const ModelDegreeLevel  = require("../master_data/degree_level/model");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;


// ==========================================
// GET CLASS STATISTICS BY YEAR AND CREATED DATE
// Get total counts and status breakdown by year or created date
// ==========================================
prop.app.get(
  `${urlAPI}/class-statistics-by-year`,
  prop.api_auth,
  prop.jwt_auth,
  prop.request_user,
  async (req, res) => {
    try {
      const { year, startDate, endDate, shift } = req.query;

      // Build query
      const query = { deleted: false };

      // Filter by year (year_study_from)
      if (year) {
        const yearInt = parseInt(year);
        if (!isNaN(yearInt)) {
          query.year_study_from = yearInt;
        }
      }

      // Filter by created_date range
      if (startDate || endDate) {
        query.created_date = {};

        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            query.created_date.$gte = start;
          }
        }

        if (endDate) {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            query.created_date.$lte = end;
          }
        }
      }

      // Filter by shift - handle both ObjectId and string
      if (shift) {
        if (mongoose.Types.ObjectId.isValid(shift)) {
          query.shift_id = new mongoose.Types.ObjectId(shift);
        } else {
          const foundShift = await ModelShift.findOne({
            deleted: false,
            $or: [
              { name: { $regex: new RegExp(`^${shift}$`, 'i') } },
              { name_in_eng: { $regex: new RegExp(`^${shift}$`, 'i') } }
            ]
          });
          
          if (foundShift) {
            query.shift_id = foundShift._id;
          } else {
            return res.status(200).json({
              success: true,
              message: "ជោគជ័យ",
              data: {
                total: 0,
                status: { start: 0, pending: 0, closed: 0 },
                byShift: [],
                byYear: [],
                byDate: [],
                filters: {
                  year: year || null,
                  startDate: startDate || null,
                  endDate: endDate || null,
                  shift: shift || null,
                },
                filtered: `វេន ${shift} (មិនមានទិន្នន័យ)`,
              },
            });
          }
        }
      }

      // Get total count
      const totalCount = await ModelClass.countDocuments(query);

      // Get counts by status
      const statusCounts = await ModelClass.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$class_status",
            count: { $sum: 1 },
          },
        },
      ]);

      // Format status counts
      const statusMap = {
        start: 0,
        pending: 0,
        closed: 0,
      };

      statusCounts.forEach((item) => {
        if (item._id in statusMap) {
          statusMap[item._id] = item.count;
        }
      });

      // Get shift counts from classes
      const shiftAggregation = await ModelClass.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$shift_id",
            count: { $sum: 1 },
            start: {
              $sum: { $cond: [{ $eq: ["$class_status", "start"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$class_status", "pending"] }, 1, 0] },
            },
            closed: {
              $sum: { $cond: [{ $eq: ["$class_status", "closed"] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Get shift data from ModelShift
      const shiftIds = shiftAggregation
        .map(item => item._id)
        .filter(id => id !== null && id !== undefined);

      let shiftCounts = [];

      if (shiftIds.length > 0) {
        // Convert all IDs to string for comparison
        const shiftIdStrings = shiftIds.map(id => id.toString());
        
        const shifts = await ModelShift.find({
          _id: { $in: shiftIds },
          deleted: false
        }).lean();

        // Create a map of shift ID (as string) to shift data
        const shiftMap = {};
        shifts.forEach(s => {
          shiftMap[s._id.toString()] = s;
        });

        // Merge shift data with counts
        shiftCounts = shiftAggregation.map(item => {
          const idStr = item._id?.toString();
          const shiftData = shiftMap[idStr] || {};
          
          return {
            shiftId: item._id,
            shiftName: shiftData.name || "N/A",
            shiftNameEng: shiftData.name_in_eng || "N/A",
            shiftNote: shiftData.note || "",
            shiftStatus: shiftData.status || false,
            count: item.count,
            start: item.start,
            pending: item.pending,
            closed: item.closed,
          };
        });
      }

      // Get additional statistics by year
      const yearStats = await ModelClass.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$year_study_from",
            count: { $sum: 1 },
            start: {
              $sum: { $cond: [{ $eq: ["$class_status", "start"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$class_status", "pending"] }, 1, 0] },
            },
            closed: {
              $sum: { $cond: [{ $eq: ["$class_status", "closed"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      // Get statistics by created_date (monthly breakdown)
      const dateStats = await ModelClass.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: "$created_date" },
              month: { $month: "$created_date" },
            },
            count: { $sum: 1 },
            start: {
              $sum: { $cond: [{ $eq: ["$class_status", "start"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$class_status", "pending"] }, 1, 0] },
            },
            closed: {
              $sum: { $cond: [{ $eq: ["$class_status", "closed"] }, 1, 0] },
            },
          },
        },
        {
          $sort: { "_id.year": -1, "_id.month": -1 },
        },
      ]);

      // Format date stats with month names
      const monthNames = [
        "មករា",
        "កុម្ភៈ",
        "មីនា",
        "មេសា",
        "ឧសភា",
        "មិថុនា",
        "កក្កដា",
        "សីហា",
        "កញ្ញា",
        "តុលា",
        "វិច្ឆិកា",
        "ធ្នូ",
      ];

      const formattedDateStats = dateStats.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        monthName: monthNames[item._id.month - 1],
        count: item.count,
        start: item.start,
        pending: item.pending,
        closed: item.closed,
      }));

      // Build filter description
      let filterDescription = "ទាំងអស់";
      const filterParts = [];
      
      if (year) filterParts.push(`ឆ្នាំ ${year}`);
      if (shift) {
        const shiftLabel = shiftCounts.find(s => 
          s.shiftId?.toString() === shift || 
          s.shiftName === shift || 
          s.shiftNameEng?.toLowerCase() === shift.toLowerCase()
        );
        filterParts.push(`វេន ${shiftLabel?.shiftName || shift}`);
      }
      if (startDate || endDate) {
        filterParts.push(`កាលបរិច្ឆេទបង្កើត ${startDate || ""} ${endDate ? `ទៅ ${endDate}` : ""}`);
      }
      
      filterDescription = filterParts.length > 0 ? filterParts.join(" និង ") : "ទាំងអស់";

      res.status(200).json({
        success: true,
        message: "ជោគជ័យ",
        data: {
          total: totalCount,
          status: statusMap,
          byShift: shiftCounts,
          byYear: yearStats,
          byDate: formattedDateStats,
          filters: {
            year: year || null,
            startDate: startDate || null,
            endDate: endDate || null,
            shift: shift || null,
          },
          filtered: filterDescription,
        },
      });
    } catch (err) {
      console.error("❌ Error fetching class statistics:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message || err,
      });
    }
  },
);

  // ==========================================
  // GET TEACHER STATISTICS BY YEAR AND CREATED DATE
  // Get total counts and status breakdown by year or created date
  // ==========================================
  prop.app.get(
    `${urlAPI}/teacher-statistics-by-year`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { year, startDate, endDate, gender, degreeLevel } = req.query;

        // Build query
        const query = { deleted: false };

        // Filter by year (created_date year)
        if (year) {
          const yearInt = parseInt(year);
          if (!isNaN(yearInt)) {
            query.created_date = {
              $gte: new Date(`${yearInt}-01-01T00:00:00.000Z`),
              $lte: new Date(`${yearInt}-12-31T23:59:59.999Z`),
            };
          }
        }

        // Filter by created_date range (overrides year filter if both exist)
        if (startDate || endDate) {
          if (!query.created_date) {
            query.created_date = {};
          }

          if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
              query.created_date.$gte = start;
            }
          }

          if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
              end.setHours(23, 59, 59, 999);
              query.created_date.$lte = end;
            }
          }
        }

        // Filter by gender
        if (gender) {
          query.gender = gender;
        }

        // Filter by degree level
        if (degreeLevel) {
          query.degree_level = degreeLevel;
        }

        // Get total count
        const totalCount = await ModelTeacher.countDocuments(query);

        // Get counts by gender
        const genderCounts = await ModelTeacher.aggregate([
          { $match: query },
          {
            $group: {
              _id: "$gender",
              count: { $sum: 1 },
            },
          },
        ]);

        // Format gender counts
        const genderMap = {
          male: 0,
          female: 0,
          other: 0,
        };

        genderCounts.forEach((item) => {
          if (item._id in genderMap) {
            genderMap[item._id] = item.count;
          }
        });

        // Get counts by degree level
        const degreeCounts = await ModelTeacher.aggregate([
          { $match: query },
          {
            $group: {
              _id: "$degree_level",
              count: { $sum: 1 },
            },
          },
        ]);

        // Format degree counts
        const degreeMap = {};
        degreeCounts.forEach((item) => {
          if (item._id) {
            degreeMap[item._id] = item.count;
          }
        });

        // Get statistics by year (created_date)
        const yearStats = await ModelTeacher.aggregate([
          { $match: query },
          {
            $group: {
              _id: { $year: "$created_date" },
              count: { $sum: 1 },
              male: {
                $sum: { $cond: [{ $eq: ["$gender", "male"] }, 1, 0] },
              },
              female: {
                $sum: { $cond: [{ $eq: ["$gender", "female"] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: -1 } },
        ]);

        // Get statistics by created_date (monthly breakdown)
        const dateStats = await ModelTeacher.aggregate([
          { $match: query },
          {
            $group: {
              _id: {
                year: { $year: "$created_date" },
                month: { $month: "$created_date" },
              },
              count: { $sum: 1 },
              male: {
                $sum: { $cond: [{ $eq: ["$gender", "male"] }, 1, 0] },
              },
              female: {
                $sum: { $cond: [{ $eq: ["$gender", "female"] }, 1, 0] },
              },
            },
          },
          {
            $sort: { "_id.year": -1, "_id.month": -1 },
          },
        ]);

        // Format date stats with month names
        const monthNames = [
          "មករា",
          "កុម្ភៈ",
          "មីនា",
          "មេសា",
          "ឧសភា",
          "មិថុនា",
          "កក្កដា",
          "សីហា",
          "កញ្ញា",
          "តុលា",
          "វិច្ឆិកា",
          "ធ្នូ",
        ];

        const formattedDateStats = dateStats.map((item) => ({
          year: item._id.year,
          month: item._id.month,
          monthName: monthNames[item._id.month - 1],
          count: item.count,
          male: item.male,
          female: item.female,
        }));

        // Build filter description
        let filterDescription = "ទាំងអស់";
        if (year && (startDate || endDate)) {
          filterDescription = `ឆ្នាំ ${year} និង កាលបរិច្ឆេទបង្កើត ${startDate || ""} ${endDate ? `ទៅ ${endDate}` : ""}`;
        } else if (year) {
          filterDescription = `ឆ្នាំ ${year}`;
        } else if (startDate || endDate) {
          filterDescription = `កាលបរិច្ឆេទបង្កើត ${startDate || ""} ${endDate ? `ទៅ ${endDate}` : ""}`;
        }

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: {
            total: totalCount,
            gender: genderMap,
            degreeLevel: degreeMap,
            byYear: yearStats,
            byDate: formattedDateStats,
            filters: {
              year: year || null,
              startDate: startDate || null,
              endDate: endDate || null,
              gender: gender || null,
              degreeLevel: degreeLevel || null,
            },
            filtered: filterDescription,
          },
        });
      } catch (err) {
        console.error("❌ Error fetching teacher statistics:", err);
        res.status(500).json({
          success: false,
          message: "Server error",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // GET STUDENT STATISTICS BY YEAR AND CREATED DATE
  // Get total counts and breakdown by gender, degree level, and major
  // ==========================================
  prop.app.get(
    `${urlAPI}/student-statistics-by-year`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { year, startDate, endDate, gender, degreeLevel, major } = req.query;

        // Build query
        const query = { deleted: false };

        // Filter by year (created_date year)
        if (year) {
          const yearInt = parseInt(year);
          if (!isNaN(yearInt)) {
            query.created_date = {
              $gte: new Date(`${yearInt}-01-01T00:00:00.000Z`),
              $lte: new Date(`${yearInt}-12-31T23:59:59.999Z`),
            };
          }
        }

        // Filter by created_date range (overrides year filter if both exist)
        if (startDate || endDate) {
          if (!query.created_date) {
            query.created_date = {};
          }

          if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
              query.created_date.$gte = start;
            }
          }

          if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
              end.setHours(23, 59, 59, 999);
              query.created_date.$lte = end;
            }
          }
        }

        // Filter by gender
        if (gender) {
          query.gender = gender;
        }

        // Filter by degree level
        if (degreeLevel) {
          query.degree_level = degreeLevel;
        }

        // Filter by major
        if (major) {
          query.major = major;
        }

        // Get total count
        const totalCount = await ModelStudent.countDocuments(query);

        // Get counts by gender
        const genderCounts = await ModelStudent.aggregate([
          { $match: query },
          {
            $group: {
              _id: "$gender",
              count: { $sum: 1 },
            },
          },
        ]);

        // Format gender counts
        const genderMap = {
          male: 0,
          female: 0,
          other: 0,
        };

        genderCounts.forEach((item) => {
          if (item._id in genderMap) {
            genderMap[item._id] = item.count;
          }
        });

        // Get counts by degree level
        const degreeCounts = await ModelStudent.aggregate([
          { $match: query },
          {
            $group: {
              _id: "$degree_level",
              count: { $sum: 1 },
            },
          },
        ]);

        // Format degree counts
        const degreeMap = {};
        degreeCounts.forEach((item) => {
          if (item._id) {
            degreeMap[item._id] = item.count;
          }
        });

        // Get counts by major (with populate)
        const majorCounts = await ModelStudent.aggregate([
          { $match: query },
          {
            $group: {
              _id: "$major",
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "majors",
              localField: "_id",
              foreignField: "_id",
              as: "majorInfo",
            },
          },
          {
            $project: {
              majorId: "$_id",
              majorName: { $arrayElemAt: ["$majorInfo.name", 0] },
              majorCode: { $arrayElemAt: ["$majorInfo.code", 0] },
              count: 1,
            },
          },
          { $sort: { count: -1 } },
        ]);

        // Get counts by study shift
        const shiftCounts = await ModelStudent.aggregate([
          { $match: query },
          {
            $group: {
              _id: "$study_shift",
              count: { $sum: 1 },
            },
          },
        ]);

        // Format shift counts
        const shiftMap = {
          morning: 0,
          afternoon: 0,
          evening: 0,
          weekend: 0,
        };

        shiftCounts.forEach((item) => {
          if (item._id in shiftMap) {
            shiftMap[item._id] = item.count;
          }
        });

        // Get statistics by year (created_date)
        const yearStats = await ModelStudent.aggregate([
          { $match: query },
          {
            $group: {
              _id: { $year: "$created_date" },
              count: { $sum: 1 },
              male: {
                $sum: { $cond: [{ $eq: ["$gender", "male"] }, 1, 0] },
              },
              female: {
                $sum: { $cond: [{ $eq: ["$gender", "female"] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: -1 } },
        ]);

        // Get statistics by created_date (monthly breakdown)
        const dateStats = await ModelStudent.aggregate([
          { $match: query },
          {
            $group: {
              _id: {
                year: { $year: "$created_date" },
                month: { $month: "$created_date" },
              },
              count: { $sum: 1 },
              male: {
                $sum: { $cond: [{ $eq: ["$gender", "male"] }, 1, 0] },
              },
              female: {
                $sum: { $cond: [{ $eq: ["$gender", "female"] }, 1, 0] },
              },
            },
          },
          {
            $sort: { "_id.year": -1, "_id.month": -1 },
          },
        ]);

        // Format date stats with month names
        const monthNames = [
          "មករា",
          "កុម្ភៈ",
          "មីនា",
          "មេសា",
          "ឧសភា",
          "មិថុនា",
          "កក្កដា",
          "សីហា",
          "កញ្ញា",
          "តុលា",
          "វិច្ឆិកា",
          "ធ្នូ",
        ];

        const formattedDateStats = dateStats.map((item) => ({
          year: item._id.year,
          month: item._id.month,
          monthName: monthNames[item._id.month - 1],
          count: item.count,
          male: item.male,
          female: item.female,
        }));

        // Build filter description
        let filterDescription = "ទាំងអស់";
        if (year && (startDate || endDate)) {
          filterDescription = `ឆ្នាំ ${year} និង កាលបរិច្ឆេទបង្កើត ${startDate || ""} ${endDate ? `ទៅ ${endDate}` : ""}`;
        } else if (year) {
          filterDescription = `ឆ្នាំ ${year}`;
        } else if (startDate || endDate) {
          filterDescription = `កាលបរិច្ឆេទបង្កើត ${startDate || ""} ${endDate ? `ទៅ ${endDate}` : ""}`;
        }

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: {
            total: totalCount,
            gender: genderMap,
            degreeLevel: degreeMap,
            major: majorCounts,
            shift: shiftMap,
            byYear: yearStats,
            byDate: formattedDateStats,
            filters: {
              year: year || null,
              startDate: startDate || null,
              endDate: endDate || null,
              gender: gender || null,
              degreeLevel: degreeLevel || null,
              major: major || null,
            },
            filtered: filterDescription,
          },
        });
      } catch (err) {
        console.error("❌ Error fetching student statistics:", err);
        res.status(500).json({
          success: false,
          message: "Server error",
          error: err.message || err,
        });
      }
    },
  );







  // ==========================================
// GET MAJOR LEARNED STATISTICS
// Get total classes and status breakdown by major
// ==========================================
prop.app.get(
  `${urlAPI}/major-learned-static`,
  prop.api_auth,
  prop.jwt_auth,
  prop.request_user,
  async (req, res) => {
    try {
      const { year, startDate, endDate } = req.query;

      // Build query
      const query = { deleted: false };

      // Filter by year (year_study_from)
      if (year) {
        const yearInt = parseInt(year);
        if (!isNaN(yearInt)) {
          query.year_study_from = yearInt;
        }
      }

      // Filter by created_date range
      if (startDate || endDate) {
        query.created_date = {};

        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            query.created_date.$gte = start;
          }
        }

        if (endDate) {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            query.created_date.$lte = end;
          }
        }
      }

      // Get total count
      const totalCount = await ModelClass.countDocuments(query);

      // Get counts by major
      const majorAggregation = await ModelClass.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$major_id",
            count: { $sum: 1 },
            start: {
              $sum: { $cond: [{ $eq: ["$class_status", "start"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$class_status", "pending"] }, 1, 0] },
            },
            closed: {
              $sum: { $cond: [{ $eq: ["$class_status", "closed"] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Get major data from ModelMajor
      const majorIds = majorAggregation
        .map(item => item._id)
        .filter(id => id !== null && id !== undefined);

      let majorCounts = [];

      if (majorIds.length > 0) {
        const majors = await ModelMajor.find({
          _id: { $in: majorIds },
          deleted: false
        }).lean();

        const majorMap = {};
        majors.forEach(m => {
          majorMap[m._id.toString()] = m;
        });

        majorCounts = majorAggregation.map(item => {
          const idStr = item._id?.toString();
          const majorData = majorMap[idStr] || {};
          
          return {
            majorId: item._id,
            majorName: majorData.name || "N/A",
            majorCode: majorData.code || "N/A",
            count: item.count,
            start: item.start,
            pending: item.pending,
            closed: item.closed,
          };
        });
      }

      // Build filter description
      let filterDescription = "ទាំងអស់";
      const filterParts = [];
      
      if (year) filterParts.push(`ឆ្នាំ ${year}`);
      if (startDate || endDate) {
        filterParts.push(`កាលបរិច្ឆេទបង្កើត ${startDate || ""} ${endDate ? `ទៅ ${endDate}` : ""}`);
      }
      
      filterDescription = filterParts.length > 0 ? filterParts.join(" និង ") : "ទាំងអស់";

      res.status(200).json({
        success: true,
        message: "ជោគជ័យ",
        data: {
          total: totalCount,
          byMajor: majorCounts,
          filters: {
            year: year || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
          filtered: filterDescription,
        },
      });
    } catch (err) {
      console.error("❌ Error fetching major statistics:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message || err,
      });
    }
  },
);

// ==========================================
// GET SUBJECT LEARNED STATISTICS
// Get total classes and status breakdown by subject
// ==========================================
prop.app.get(
  `${urlAPI}/subject-learned-static`,
  prop.api_auth,
  prop.jwt_auth,
  prop.request_user,
  async (req, res) => {
    try {
      const { year, startDate, endDate } = req.query;

      // Build query
      const query = { deleted: false };

      // Filter by year (year_study_from)
      if (year) {
        const yearInt = parseInt(year);
        if (!isNaN(yearInt)) {
          query.year_study_from = yearInt;
        }
      }

      // Filter by created_date range
      if (startDate || endDate) {
        query.created_date = {};

        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            query.created_date.$gte = start;
          }
        }

        if (endDate) {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            query.created_date.$lte = end;
          }
        }
      }

      // Get total count
      const totalCount = await ModelClass.countDocuments(query);

      // Get counts by subject (from schedule)
      const subjectAggregation = await ModelClass.aggregate([
        { $match: query },
        { $unwind: "$schedule" },
        {
          $group: {
            _id: "$schedule.subject_id",
            count: { $sum: 1 },
            classCount: { $addToSet: "$_id" },
            start: {
              $sum: { $cond: [{ $eq: ["$class_status", "start"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$class_status", "pending"] }, 1, 0] },
            },
            closed: {
              $sum: { $cond: [{ $eq: ["$class_status", "closed"] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 1,
            count: 1,
            classCount: { $size: "$classCount" },
            start: 1,
            pending: 1,
            closed: 1,
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Get subject data from ModelSubject
      const subjectIds = subjectAggregation
        .map(item => item._id)
        .filter(id => id !== null && id !== undefined);

      let subjectCounts = [];

      if (subjectIds.length > 0) {
        const subjects = await ModelSubject.find({
          _id: { $in: subjectIds },
          deleted: false
        }).lean();

        const subjectMap = {};
        subjects.forEach(s => {
          subjectMap[s._id.toString()] = s;
        });

        subjectCounts = subjectAggregation.map(item => {
          const idStr = item._id?.toString();
          const subjectData = subjectMap[idStr] || {};
          
          return {
            subjectId: item._id,
            subjectName: subjectData.name || "N/A",
            subjectCode: subjectData.code || "N/A",
            count: item.count,
            classCount: item.classCount || 0,
            start: item.start,
            pending: item.pending,
            closed: item.closed,
          };
        });
      }

      // Build filter description
      let filterDescription = "ទាំងអស់";
      const filterParts = [];
      
      if (year) filterParts.push(`ឆ្នាំ ${year}`);
      if (startDate || endDate) {
        filterParts.push(`កាលបរិច្ឆេទបង្កើត ${startDate || ""} ${endDate ? `ទៅ ${endDate}` : ""}`);
      }
      
      filterDescription = filterParts.length > 0 ? filterParts.join(" និង ") : "ទាំងអស់";

      res.status(200).json({
        success: true,
        message: "ជោគជ័យ",
        data: {
          total: totalCount,
          bySubject: subjectCounts,
          filters: {
            year: year || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
          filtered: filterDescription,
        },
      });
    } catch (err) {
      console.error("❌ Error fetching subject statistics:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message || err,
      });
    }
  },
);

// ==========================================
// GET DEGREE LEVEL LEARNED STATISTICS
// Get total classes and status breakdown by degree level
// ==========================================
prop.app.get(
  `${urlAPI}/degree-level-static`,
  prop.api_auth,
  prop.jwt_auth,
  prop.request_user,
  async (req, res) => {
    try {
      const { year, startDate, endDate } = req.query;

      // Build query
      const query = { deleted: false };

      // Filter by year (year_study_from)
      if (year) {
        const yearInt = parseInt(year);
        if (!isNaN(yearInt)) {
          query.year_study_from = yearInt;
        }
      }

      // Filter by created_date range
      if (startDate || endDate) {
        query.created_date = {};

        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            query.created_date.$gte = start;
          }
        }

        if (endDate) {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            query.created_date.$lte = end;
          }
        }
      }

      // Get total count
      const totalCount = await ModelClass.countDocuments(query);

      // Get counts by degree level
      const degreeAggregation = await ModelClass.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$degree_level_id",
            count: { $sum: 1 },
            start: {
              $sum: { $cond: [{ $eq: ["$class_status", "start"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$class_status", "pending"] }, 1, 0] },
            },
            closed: {
              $sum: { $cond: [{ $eq: ["$class_status", "closed"] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Get degree level data from ModelDegreeLevel
      const degreeIds = degreeAggregation
        .map(item => item._id)
        .filter(id => id !== null && id !== undefined);

      let degreeCounts = [];

      if (degreeIds.length > 0) {
        const degrees = await ModelDegreeLevel.find({
          _id: { $in: degreeIds },
          deleted: false
        }).lean();

        const degreeMap = {};
        degrees.forEach(d => {
          degreeMap[d._id.toString()] = d;
        });

        degreeCounts = degreeAggregation.map(item => {
          const idStr = item._id?.toString();
          const degreeData = degreeMap[idStr] || {};
          
          return {
            degreeId: item._id,
            degreeName: degreeData.name || "N/A",
            degreeNameEng: degreeData.name_in_eng || "N/A",
            degreeCode: degreeData.code || "N/A",
            count: item.count,
            start: item.start,
            pending: item.pending,
            closed: item.closed,
          };
        });
      }

      // Build filter description
      let filterDescription = "ទាំងអស់";
      const filterParts = [];
      
      if (year) filterParts.push(`ឆ្នាំ ${year}`);
      if (startDate || endDate) {
        filterParts.push(`កាលបរិច្ឆេទបង្កើត ${startDate || ""} ${endDate ? `ទៅ ${endDate}` : ""}`);
      }
      
      filterDescription = filterParts.length > 0 ? filterParts.join(" និង ") : "ទាំងអស់";

      res.status(200).json({
        success: true,
        message: "ជោគជ័យ",
        data: {
          total: totalCount,
          byDegree: degreeCounts,
          filters: {
            year: year || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
          filtered: filterDescription,
        },
      });
    } catch (err) {
      console.error("❌ Error fetching degree level statistics:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message || err,
      });
    }
  },
);





};

module.exports = route;