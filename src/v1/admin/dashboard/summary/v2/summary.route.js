const baseRoute = "summary";
const { count } = require("console");
const modelTransaction = require("../../balance_transaction/balance_transaction.model");
const modelClosingBalace = require("../../note/closing_balance/closing_balance.model");
const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  prop.app.get(
    `${urlAPI}/transaction-income-expense-closing-balance-net`,
    prop.api_auth,
    prop.jwt_auth,
    async (req, res) => {
      // Loading Transction
      if (!req.query.year) {
        return res.status(400).json({
          success: false,
          message: "Year is required",
        });
      }
      const result = await modelTransaction.find({
        "filter_date.year": parseInt(req.query.year),
      });

      var preparedData = {};
      var total_income_usd = 0;
      var total_expense_usd = 0;
      var total_income_kh = 0;
      var total_expense_kh = 0;
      var count_income = 0;
      var count_expense = 0;

      var list_Of_Month_Detail = [];
      for (let i = 1; i <= 12; i++) {
        list_Of_Month_Detail.push({
          month: i,
          usd: {
            count_income: 0,
            count_expense: 0,
            amount_income: 0,
            amount_expense: 0,
          },
          kh: {
            count_income: 0,
            count_expense: 0,
            amount_income: 0,
            amount_expense: 0,
          },
        });
      }

      result.map((item, index) => {
        // add to detail monthly
        list_Of_Month_Detail.map((month, i) => {
          if (item.filter_date.month == month.month) {
            if (item.currency == "USD") {
              if (
                item.tran_type == "income" &&
                item.tran_status == "completed"
              ) {
                month.usd.count_income++;
                month.usd.amount_income += item.amount;
              } else if (
                item.tran_type == "expense" &&
                item.tran_status == "completed"
              ) {
                month.usd.count_expense++;
                month.usd.amount_expense += item.amount;
              }
            } else {
              if (
                item.tran_type == "income" &&
                item.tran_status == "completed"
              ) {
                month.kh.count_income++;
                month.kh.amount_income += item.amount;
              } else if (
                item.tran_type == "expense" &&
                item.tran_status == "completed"
              ) {
                month.kh.count_expense++;
                month.kh.amount_expense += item.amount;
              }
            }
          }
        });

        // add to dashboard
        if (item.currency == "USD") {
          if (item.tran_type == "income" && item.tran_status == "completed") {
            count_income++;
            total_income_usd += item.amount;
          } else if (
            item.tran_type == "expense" &&
            item.tran_status == "completed"
          ) {
            count_expense++;
            total_expense_usd += item.amount;
          }
        } else {
          if (item.tran_type == "income" && item.tran_status == "completed") {
            count_income++;
            total_income_kh += item.amount;
          } else if (
            item.tran_type == "expense" &&
            item.tran_status == "completed"
          ) {
            count_expense++;
            total_expense_kh += item.amount;
          }
        }
      });

      preparedData.current_year_transaction = {
        total_income_usd,
        total_expense_usd,
        total_income_kh,
        total_expense_kh,
        count_income,
        count_expense,
      };

      // Loading Yealr Previos
      var requestYear = parseInt(req.query.year);
      var yearly = await modelClosingBalace.findOne({
        balance_closed_year: requestYear - 1,
      });

      preparedData.previous_closing_balance = {
        balance_usd: yearly == null ? 0 : yearly.balance_closed_amount_usd,
        balance_kh: yearly == null ? 0 : yearly.balance_closed_amount_khr,
      };

      preparedData.current_balance = {
        balance_usd:
          yearly == null
            ? 0
            : yearly.balance_closed_amount_usd +
              total_income_usd -
              total_expense_usd,
        balance_kh:
          yearly == null
            ? 0
            : yearly.balance_closed_amount_khr +
              total_income_kh -
              total_expense_kh,
      };

      preparedData.count_transaction = result.length;
      preparedData.transaction_monthly = list_Of_Month_Detail;

      res.status(200).json({
        success: true,
        data: preparedData,
        origin: {
          transaction: result,
          year_previos: yearly,
        },
      });
    }
  );
};

module.exports = route;
