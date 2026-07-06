const baseRoute = "summary";
const NoteModel = require("../../dashboard/note/income_expense/note.model");
const AccountTypeModel = require("../../dashboard/master_data/account_type/account_type.model");
const modelCashFlow = require("../../dashboard/master_data/cash_flow/cash_flow.model");
const modelBalanceTransaction = require("../../dashboard/balance_transaction/balance_transaction.model");
const modelPrepayment = require("../../dashboard/note/prepayment_balance/prepayment_balance.model");
const modelClosingBalace = require("../note/closing_balance/closing_balance.model");
const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  prop.app.get(`${urlAPI}`, prop.api_auth, prop.jwt_auth, async (req, res) => {
    const result = await getNoteByYearRange(req);

    res.json({
      success: true,
      ...result,
    });
  });

  // Total Account Type
  prop.app.get(
    `${urlAPI}/account-type`,
    prop.api_auth,
    prop.jwt_auth,
    async (req, res) => {
      const result = await getNoteByYearRange(req);
      const resultAccountType = await AccountTypeModel.find();

      const accountTypeMap = new Map();
      if (Array.isArray(result.data)) {
        result.data.forEach((note) => {
          const key = note.account_type_id?.toString(); // 🧠 force ObjectId to string

          if (!key) return; // Skip if undefined/null

          if (accountTypeMap.has(key)) {
            accountTypeMap.get(key).transaction_count += 1;
            accountTypeMap.get(key).amount_usd += note.amount_usd;
            accountTypeMap.get(key).amount_khr += note.amount_khr;
          } else {
            accountTypeMap.set(key, {
              amount_usd: note.amount_usd,
              amount_khr: note.amount_khr,
              account_type_id: key,
              transaction_count: 1,
            });
          }
        });
      }
      const groupedAccountTypes = Array.from(accountTypeMap.values());
      // Find name
      groupedAccountTypes.map((rowType) => {
        resultAccountType.map((dbType) => {
          if (rowType.account_type_id === dbType._id.toString()) {
            rowType.name = dbType.name;
          }
        });
      });

      res.json({
        success: true,
        account_type_result: groupedAccountTypes,
        account_type: resultAccountType,
      });
    }
  );

  // Total Income and Expense
  prop.app.get(
    `${urlAPI}/income-expense`,
    prop.api_auth,
    prop.jwt_auth,
    async (req, res) => {
      const result = await getNoteByYearRange(req);

      var listIncome = [];
      var listExpense = [];

      var listTranUSD = [];
      var total_listTranUSD = 0;
      var usd_Amount_Income = 0;
      var usd_Amount_Expense = 0;

      var listTranKHR = [];
      var total_listTranKHR = 0;
      var khr_Amount_Income = 0;
      var khr_Amount_Expense = 0;

      if (Array.isArray(result.data)) {
        result.data.forEach((note) => {
          // by income or expense
          if (note.tran_type == "income") {
            listIncome.push(note);
          } else {
            listExpense.push(note);
          }

          // by usd and khr
          if (note.amount_usd > 0) {
            listTranUSD.push(note);
            total_listTranUSD += note.amount_usd;
            if (note.tran_type == "income") {
              usd_Amount_Income += note.amount_usd;
            } else {
              usd_Amount_Expense += note.amount_usd;
            }
          }

          if (note.amount_khr > 0) {
            listTranKHR.push(note);
            total_listTranKHR += note.amount_khr;
            if (note.tran_type == "income") {
              khr_Amount_Income += note.amount_khr;
            } else {
              khr_Amount_Expense += note.amount_khr;
            }
          }
        });
      }

      res.json({
        income_expense_data: {
          origin: {
            income: listIncome,
            income_transaction_count: listIncome.length,
            expense: listExpense,
            expense_transaction_count: listExpense.length,
          },

          by_amount_usd: {
            count: {
              transaction: listTranUSD.length,
              income: usd_Amount_Income,
              expense: usd_Amount_Expense,
              data: listTranUSD,
            },
          },

          by_amount_khr: {
            count: {
              transaction: listTranKHR.length,
              income: khr_Amount_Income,
              expense: khr_Amount_Expense,
              data: listTranKHR,
            },
          },
        },

        success: true,
      });
    }
  );

  // Total Bar Chart
  prop.app.get(
    `${urlAPI}/bar-chart`,
    prop.api_auth,
    prop.jwt_auth,
    async (req, res) => {
      const result = await getNoteByYearRange(req);

      var dataSend = [];
      var tranTotalIncome = 0;
      var tranTotalExpense = 0;
      if (Array.isArray(result.data)) {
        for (let i = 1; i <= 12; i++) {
          var rowPrepared = {
            month: i,
          };
          var totalIncome_KHR = 0;
          var totalIncome_USD = 0;

          var totalExpense_USD = 0;
          var totalExpense_KHR = 0;

          result.data.forEach((rowNote) => {
            if (rowNote.filter_date.month == i) {
              if (rowNote.tran_type == "income") {
                // income
                if (rowNote.amount_usd > 0) {
                  // usd
                  totalIncome_USD += rowNote.amount_usd;
                }
                if (rowNote.amount_khr > 0) {
                  // khr
                  totalIncome_KHR += rowNote.amount_khr;
                }
                tranTotalIncome++;
              } else {
                // expense
                if (rowNote.amount_usd > 0) {
                  //usd
                  totalExpense_USD += rowNote.amount_usd;
                }
                if (rowNote.amount_khr > 0) {
                  totalExpense_KHR += rowNote.amount_khr;
                }
                tranTotalExpense++;
              }
            }

            rowPrepared.income = {
              usd: totalIncome_USD,
              khr: totalIncome_KHR,
            };
            rowPrepared.expense = {
              usd: totalExpense_USD,
              khr: totalExpense_KHR,
            };
          });
          dataSend.push(rowPrepared);
        }
      }

      res.json({
        success: true,
        barchart: {
          count: {
            transaction_income: tranTotalIncome,
            transaction_expense: tranTotalExpense,
          },
          monthly: {
            data: dataSend,
          },
        },
      });
    }
  );

  // Total relevant Peopel
  prop.app.get(
    `${urlAPI}/relevant-people`,
    prop.api_auth,
    prop.jwt_auth,
    async (req, res) => {
      const { startDate, endDate } = req.query;

      const filter = {};

      // ✅ Build date range filter only if both dates are provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        filter["filter_date.year"] = {
          $gte: start.getFullYear(),
          $lte: end.getFullYear(),
        };
        filter["filter_date.month"] = {
          $gte: start.getMonth() + 1,
          $lte: end.getMonth() + 1,
        };
        filter["filter_date.day"] = {
          $gte: start.getDate(),
          $lte: end.getDate(),
        };
      }

      // You can expand this filter as needed
      const result = await NoteModel.find(filter).populate(
        "relevant_people_id"
      );

      var listTemp = [];
      if (Array.isArray(result)) {
        result.forEach((note) => {
          var isCanAdd = true;
          listTemp.map((tempNote) => {
            if (tempNote._id == note.relevant_people_id._id) {
              if (note.tran_type == "income") {
                if (note.amount_usd > 0) {
                  tempNote.income.usd += note.amount_usd;
                }
                if (note.amount_khr > 0) {
                  tempNote.income.khr += note.amount_khr;
                }
                tempNote.income.count = tempNote.income.count + 1;
              } else {
                if (note.amount_usd > 0) {
                  tempNote.expense.usd += note.amount_usd;
                }
                if (note.amount_khr > 0) {
                  tempNote.expense.khr += note.amount_khr;
                }
                tempNote.expense.count = tempNote.expense.count + 1;
              }

              isCanAdd = false;
            }
          });

          if (isCanAdd) {
            var incomeUSD = 0;
            var incomeKHR = 0;
            var incomeCount = 0;

            var expenseKHR = 0;
            var expenseUSD = 0;
            var expenseCount = 0;

            if (note.tran_type == "income") {
              if (note.amount_usd > 0) {
                incomeUSD += note.amount_usd;
              }
              if (note.amount_khr > 0) {
                incomeKHR += note.amount_khr;
              }
              incomeCount = 1;
            } else {
              if (note.amount_usd > 0) {
                expenseUSD += note.amount_usd;
              }
              if (note.amount_khr > 0) {
                expenseKHR += note.amount_khr;
              }
              expenseCount = 1;
            }
            var object = {
              _id: note.relevant_people_id._id,
              name: note.relevant_people_id.fullname,
              income: {
                usd: incomeUSD,
                khr: incomeKHR,
                count: incomeCount,
              },
              expense: {
                usd: expenseUSD,
                khr: expenseKHR,
                count: expenseCount,
              },
            };
            listTemp.push(object);
          }
        });
      }

      res.json({
        success: true,
        data: listTemp,
      });
    }
  );
  async function getNoteByYearRange(req) {
    const { startDate, endDate } = req.query;

    const filter = {};

    // ✅ Build date range filter only if both dates are provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filter["filter_date.year"] = {
        $gte: start.getFullYear(),
        $lte: end.getFullYear(),
      };
      filter["filter_date.month"] = {
        $gte: start.getMonth() + 1,
        $lte: end.getMonth() + 1,
      };
      filter["filter_date.day"] = {
        $gte: start.getDate(),
        $lte: end.getDate(),
      };
    }

    // You can expand this filter as needed
    const data = await NoteModel.find(filter);

    return {
      message: "Success",
      filter: {
        start: startDate,
        end: endDate,
      },
      count: data.length,
      data: data,
    };
  }

  // ================================
  // Export
  // ================================
  prop.app.get(
    `${urlAPI}/data-dashboard`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      const { year } = req.query;
      const { user_id: userId, user_data: { unit_id, is_super_admin } = {} } =
        req.session;
      const dataWillSend = {};

      if (!year) {
        return res.status(400).json({
          success: false,
          message: "year (year) is required",
        });
      }

      // Parse the dates from MM-DD-YYYY format
      const filter = {};

      // ================================
      // Get current balance
      const cashFlow = await modelCashFlow.find({
        deleted: false,
        unit_id: unit_id,
      });

      var balance = {
        total: {
          khr: 0,
          usd: 0,
        },
        cash: {
          khr: {
            in_hand: 0,
            bank: 0,
          },
          usd: {
            in_hand: 0,
            bank: 0,
          },
        },
      };

      cashFlow.forEach((item) => {
        if (item.currency == "USD") {
          balance.total.usd += item.balance;
          if (item.type == "cash_in_hand") {
            balance.cash.usd.in_hand += item.balance;
          } else {
            balance.cash.usd.bank += item.balance;
          }
        } else {
          balance.total.khr += item.balance;
          if (item.type == "cash_in_hand") {
            balance.cash.khr.in_hand += item.balance;
          } else {
            balance.cash.khr.bank += item.balance;
          }
        }
      });
      dataWillSend.current_balance = balance;

      // ================================
      // Get Transaction Requestion
      if (year) {
        filter["filter_date.year"] = parseInt(year);
      }
      filter["tran_status"] = "pending";
      filter["unit_id"] = unit_id;
      if (!is_super_admin) {
        filter["created_by"] = userId;
      }
      const transactions = await modelBalanceTransaction.find({
        ...filter,
        deleted: false,
        unit_id: unit_id,
      });
      dataWillSend.transaction_pending = transactions;

      // ================================
      // Get Prepayment
      delete filter["tran_status"];
      filter["transaction_status"] = "pending";

      if (!is_super_admin) {
        filter["created_by"] = userId;
      }
      const prepayment = await modelPrepayment.find(filter);
      dataWillSend.prepayment_pending = prepayment;

      // ================================
      // Get Transaction Requestion || Income and Expense
      const date = new Date();
      var listChart = [];
      var transaction_total = {
        usd: {
          count: 0,
          expense: 0,
          income: 0,
        },
        khr: {
          count: 0,
          expense: 0,
          income: 0,
        },
      };

      var summary_previous_and_current_year = {
        prevoius_left_year_balance: {
          usd: 0,
          khr: 0,
        },

        current_income_year_balance: {
          usd: 0,
          khr: 0,
        },

        current_expense_year_balance: {
          usd: 0,
          khr: 0,
        },

        current_net_balance: {
          usd: 0,
          khr: 0,
        },
      };

      for (let i = 1; i <= date.getMonth() + 1; i++) {
        var filters = {
          unit_id: unit_id,
          "filter_date.year": parseInt(year),
          "filter_date.month": parseInt(i),
          deleted: false,
          tran_status: { $in: ["completed"] },
          created_by: userId,
        };

        if (is_super_admin) {
          delete filters.created_by;
        }

        const transactionFilter = await modelBalanceTransaction.find(filters);

        var count_usd = 0;
        var count_khr = 0;
        var income_usd = 0;
        var income_khr = 0;
        var expense_usd = 0;
        var expense_khr = 0;

        transactionFilter.map((row) => {
          if (row.currency == "USD") {
            // Check Summary Prev and current year
            if (
              row.is_this_transaction_closing_balance &&
              row.tran_type == "income"
            ) {
              summary_previous_and_current_year.prevoius_left_year_balance.usd =
                row.amount;
            }

            // Count
            count_usd += 1;
            if (row.tran_type == "income") {
              income_usd += row.amount;
            } else {
              expense_usd += row.amount;
            }
          } else {
            // Check Summary Prevoise and current year
            if (
              row.is_this_transaction_closing_balance &&
              row.tran_type == "income"
            ) {
              summary_previous_and_current_year.prevoius_left_year_balance.khr =
                row.amount;
            }
            // Count
            count_khr += 1;
            if (row.tran_type == "income") {
              income_khr += row.amount;
            } else {
              expense_khr += row.amount;
            }
          }
        });

        listChart.push({
          month: i,
          year: date.getFullYear(),
          balance: {
            income: {
              usd: income_usd,
              khr: income_khr,
              count: count_usd,
            },
            expense: {
              usd: expense_usd,
              khr: expense_khr,
              count: count_khr,
            },
          },
        });

        transaction_total.usd.count += count_usd;
        transaction_total.usd.income += income_usd;
        transaction_total.usd.expense += expense_usd;
        transaction_total.khr.count += count_khr;
        transaction_total.khr.income += income_khr;
        transaction_total.khr.expense += expense_khr;
      }

      // Pre Year
      var prevYear = await modelClosingBalace.findOne({
        balance_closed_year: year - 1,
        unit_id: unit_id,
      });

      // Cal Summary
      //******* Income */
      summary_previous_and_current_year.current_income_year_balance.usd =
        transaction_total.usd.income -
        summary_previous_and_current_year.prevoius_left_year_balance.usd;
      summary_previous_and_current_year.current_income_year_balance.khr =
        transaction_total.khr.income -
        summary_previous_and_current_year.prevoius_left_year_balance.khr;

      //******* Expense */
      summary_previous_and_current_year.current_expense_year_balance.usd =
        transaction_total.usd.expense;
      summary_previous_and_current_year.current_expense_year_balance.khr =
        transaction_total.khr.expense;

      //******* Net */
      summary_previous_and_current_year.current_net_balance.usd =
        balance.total.usd;
      summary_previous_and_current_year.current_net_balance.khr =
        balance.total.khr;

      // Calculator
      dataWillSend.transaction_chart = listChart;

      transaction_total.usd.cross_profit =
        transaction_total.usd.income - transaction_total.usd.expense;
      transaction_total.khr.cross_profit =
        transaction_total.khr.income - transaction_total.khr.expense;
      dataWillSend.transaction_total = transaction_total;
      dataWillSend.summary_previous_and_current_year =
        summary_previous_and_current_year;

      dataWillSend.summary_previous_and_current_year.prevoius_left_year_balance.usd =
        prevYear == null ? 0 : prevYear.balance_closed_amount_usd;

      dataWillSend.summary_previous_and_current_year.prevoius_left_year_balance.khr =
        prevYear == null ? 0 : prevYear.balance_closed_amount_khr;

      res.send({
        success: true,
        data: dataWillSend,
      });
    }
  );
};

module.exports = route;
