-- account_balances(): per-account balance computed server-side
CREATE OR REPLACE FUNCTION account_balances()
RETURNS TABLE(
  id              uuid,
  user_id         uuid,
  name            text,
  type            text,
  currency        text,
  initial_balance numeric,
  balance         numeric,
  created_at      timestamptz
)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    a.id, a.user_id, a.name, a.type::text,
    a.currency, a.initial_balance,
    a.initial_balance + COALESCE(SUM(
      CASE
        WHEN t.type = 'income'   AND t.account_id             = a.id THEN  t.amount
        WHEN t.type = 'expense'  AND t.account_id             = a.id THEN -t.amount
        WHEN t.type = 'transfer' AND t.account_id             = a.id THEN -t.amount
        WHEN t.type = 'transfer' AND t.transfer_to_account_id = a.id THEN  t.amount
        ELSE 0
      END
    ), 0) AS balance,
    a.created_at
  FROM accounts a
  LEFT JOIN transactions t
    ON (t.account_id = a.id OR t.transfer_to_account_id = a.id)
  WHERE a.user_id = auth.uid()
  GROUP BY a.id, a.user_id, a.name, a.type, a.currency, a.initial_balance, a.created_at
  ORDER BY a.created_at
$$;

-- net_worth_series(): monthly cumulative net worth for the chart
CREATE OR REPLACE FUNCTION net_worth_series()
RETURNS TABLE(month text, value numeric)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  WITH initial AS (
    SELECT COALESCE(SUM(initial_balance), 0) AS total
    FROM accounts WHERE user_id = auth.uid()
  ),
  monthly_net AS (
    SELECT
      to_char(date_trunc('month', date), 'YYYY-MM') AS month,
      SUM(CASE
        WHEN type = 'income'  THEN  amount
        WHEN type = 'expense' THEN -amount
        ELSE 0
      END) AS net
    FROM transactions
    WHERE user_id = auth.uid()
    GROUP BY 1
  )
  SELECT
    month,
    (SELECT total FROM initial)
      + SUM(net) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      AS value
  FROM monthly_net
  ORDER BY month
$$;
