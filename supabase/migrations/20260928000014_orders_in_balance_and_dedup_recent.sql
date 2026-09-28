-- =====================================================================
-- Siparişlerin cari bakiyesine dahil edilmesi ve Son Hareketler mükerrer
-- masraf kayıtlarının tekleştirilmesi güncellemesi
-- =====================================================================

-- 1. Cari bakiyeleri görünümü (Satış & Satın Alma siparişleri dahil)
create or replace view public.contact_balances
with (security_invoker = true) as
with doc as (
  select contact_id,
         sum(case when doc_type in ('sales_invoice','pos_sale','purchase_return') then total_try
                  when doc_type = 'sales_order' and status not in ('draft','cancelled','converted') then total_try
                  when doc_type in ('purchase_invoice','sales_return','expense') then -total_try
                  when doc_type = 'purchase_order' and status not in ('draft','cancelled','converted') then -total_try
                  else 0 end) as amt
    from public.documents
   where deleted_at is null and contact_id is not null and status not in ('draft','cancelled')
   group by contact_id
), txn as (
  select contact_id,
         sum(case direction when 'in' then -amount_try when 'out' then amount_try else 0 end) as amt
    from public.transactions
   where deleted_at is null and contact_id is not null
   group by contact_id
)
select c.id as contact_id, c.org_id,
       round(c.opening_balance + coalesce(doc.amt, 0) + coalesce(txn.amt, 0), 2) as balance,
       true as includes_orders
  from public.contacts c
  left join doc on doc.contact_id = c.id
  left join txn on txn.contact_id = c.id
 where c.deleted_at is null;

-- 2. Cari ekstre fonksiyonu (Siparişler dahil)
create or replace function public.contact_statement(p_contact uuid, p_from date default null, p_to date default null)
returns table (
  entry_date date, kind text, ref_id uuid, ref_type text, number text, description text,
  debit numeric, credit numeric, balance numeric, due_date date
)
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  c public.contacts;
  v_from date;
begin
  select * into c from public.contacts where id = p_contact;
  if c.id is null then return; end if;
  v_from := coalesce(p_from, '1900-01-01'::date);

  return query
  with entries as (
    select coalesce(c.opening_balance_date, c.created_at::date) as d, 'opening'::text as k, c.id as rid, 'opening'::text as rt,
           null::text as num, 'Açılış bakiyesi'::text as descr,
           greatest(c.opening_balance, 0) as dr, greatest(-c.opening_balance, 0) as cr, null::date as due, c.created_at as at
      where c.opening_balance <> 0
    union all
    select d.issue_date, 'document', d.id, d.doc_type, d.number, coalesce(d.description, d.number),
           case when d.doc_type in ('sales_invoice','pos_sale','purchase_return') then d.total_try
                when d.doc_type = 'sales_order' and d.status not in ('draft','cancelled','converted') then d.total_try
                else 0 end,
           case when d.doc_type in ('purchase_invoice','sales_return','expense') then d.total_try
                when d.doc_type = 'purchase_order' and d.status not in ('draft','cancelled','converted') then d.total_try
                else 0 end,
           d.due_date, d.created_at
      from public.documents d
     where d.contact_id = p_contact and d.deleted_at is null and d.status not in ('draft','cancelled')
       and (
         d.doc_type in ('sales_invoice','pos_sale','purchase_return','purchase_invoice','sales_return','expense')
         or (d.doc_type in ('sales_order','purchase_order') and d.status <> 'converted')
       )
    union all
    select t.txn_date, 'transaction', t.id, t.type, t.reference, t.description,
           case when t.direction = 'out' then t.amount_try else 0 end,
           case when t.direction = 'in' then t.amount_try else 0 end,
           null::date, t.created_at
      from public.transactions t
     where t.contact_id = p_contact and t.deleted_at is null and t.direction in ('in','out')
  ),
  ordered as (
    select e.*, sum(e.dr - e.cr) over (order by e.d, e.at, e.rid rows unbounded preceding) as bal
      from entries e
  )
  select o.d, o.k, o.rid, o.rt, o.num, o.descr, round(o.dr, 2), round(o.cr, 2), round(o.bal, 2), o.due
    from ordered o
   where o.d >= v_from and (p_to is null or o.d <= p_to)
   order by o.d, o.at, o.rid;
end;
$$;

-- 3. Panel özeti (Açık siparişlerin nakit akışına ve mükerrer masraf hareketlerinin elenmesi)
create or replace function public.dashboard_summary(p_org uuid, p_today date default current_date)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  v_month_start date := date_trunc('month', p_today)::date;
  v_prev_month_start date := (date_trunc('month', p_today) - interval '1 month')::date;
  v_usd numeric := coalesce(public.latest_rate('USD', p_today), 0);
  v_eur numeric := coalesce(public.latest_rate('EUR', p_today), 0);
  v_result jsonb;
  v_cash numeric;
begin
  if not public.is_member(p_org) then raise exception 'Yetkisiz'; end if;

  select coalesce(sum(case when currency = 'TRY' then balance
                           when currency = 'USD' then balance * v_usd
                           when currency = 'EUR' then balance * v_eur else 0 end), 0)
    into v_cash
    from public.accounts where org_id = p_org and deleted_at is null and type in ('cash','bank');

  with open_docs as (
    select d.id, d.doc_type, d.number, d.issue_date, d.due_date, d.currency,
           d.total, d.paid_amount, d.exchange_rate,
           round((d.total - d.paid_amount) * d.exchange_rate, 2) as remaining_try,
           case when d.doc_type in ('sales_invoice','pos_sale','sales_order') then 'in' else 'out' end as flow,
           coalesce(c.name, e.name, cat.name, d.description) as party
      from public.documents d
      left join public.contacts c on c.id = d.contact_id
      left join public.employees e on e.id = d.employee_id
      left join public.categories cat on cat.id = d.category_id
     where d.org_id = p_org and d.deleted_at is null
       and d.status not in ('draft','cancelled','converted')
       and d.doc_type in ('sales_invoice','pos_sale','purchase_invoice','expense','salary','sales_order','purchase_order')
       and d.payment_status in ('unpaid','partial')
  ),
  month_sales as (
    select coalesce(sum(case when doc_type = 'sales_return' then -total_try else total_try end), 0) as amt
      from public.documents
     where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
       and doc_type in ('sales_invoice','pos_sale','sales_return')
       and issue_date >= v_month_start and issue_date <= p_today
  ),
  month_expenses as (
    select coalesce(sum(total_try), 0) as amt
      from public.documents
     where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
       and doc_type in ('expense','salary')
       and issue_date >= v_month_start and issue_date <= p_today
  ),
  vat as (
    select
      coalesce(sum(case when issue_date >= v_month_start then
        case when doc_type in ('sales_invoice','pos_sale','purchase_return') then vat_total * exchange_rate
             when doc_type in ('purchase_invoice','expense','sales_return') then -vat_total * exchange_rate else 0 end end), 0) as this_month,
      coalesce(sum(case when issue_date < v_month_start then
        case when doc_type in ('sales_invoice','pos_sale','purchase_return') then vat_total * exchange_rate
             when doc_type in ('purchase_invoice','expense','sales_return') then -vat_total * exchange_rate else 0 end end), 0) as last_month
      from public.documents
     where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
       and issue_date >= v_prev_month_start and issue_date <= p_today
  ),
  balances as (
    select coalesce(sum(balance) filter (where balance > 0), 0) as receivable,
           coalesce(-sum(balance) filter (where balance < 0), 0) as payable
      from public.contact_balances where org_id = p_org
  ),
  weeks as (
    select g as week_no, (p_today + g * 7) as week_start
      from generate_series(0, 11) g
  ),
  cheque_flow as (
    select case when direction = 'received' then 'in' else 'out' end as flow,
           due_date, round(amount * exchange_rate, 2) as amt
      from public.cheques
     where org_id = p_org and deleted_at is null and status in ('portfolio','deposited')
  ),
  flow_items as (
    select flow, coalesce(due_date, p_today) as due, remaining_try as amt from open_docs
    union all
    select flow, due_date, amt from cheque_flow
  ),
  cash_flow as (
    select w.week_no, w.week_start,
           coalesce(sum(f.amt) filter (where f.flow = 'in'), 0) as inflow,
           coalesce(sum(f.amt) filter (where f.flow = 'out'), 0) as outflow
      from weeks w
      left join flow_items f on f.due >= w.week_start and f.due < (w.week_start + 7)
     group by w.week_no, w.week_start
  )
  select jsonb_build_object(
    'today', p_today,
    'rates', jsonb_build_object('USD', v_usd, 'EUR', v_eur),
    'kpi', jsonb_build_object(
      'month_sales', round((select amt from month_sales), 2),
      'month_expenses', round((select amt from month_expenses), 2),
      'today_collections', coalesce((
        select round(sum(amount_try), 2) from public.transactions
         where org_id = p_org and deleted_at is null and direction = 'in' and txn_date = p_today), 0),
      'cash_bank', round(v_cash, 2),
      'receivable', round((select receivable from balances), 2),
      'payable', round((select payable from balances), 2)
    ),
    'collections', jsonb_build_object(
      'total', coalesce((select round(sum(remaining_try), 2) from open_docs where flow = 'in'), 0),
      'overdue', coalesce((select round(sum(remaining_try), 2) from open_docs where flow = 'in' and due_date < p_today), 0),
      'unplanned', coalesce((select count(*) from open_docs where flow = 'in' and due_date is null), 0),
      'unprinted', coalesce((select count(*) from public.documents where org_id = p_org and deleted_at is null
                                and doc_type = 'sales_invoice' and status not in ('draft','cancelled') and not is_printed), 0)
    ),
    'payments', jsonb_build_object(
      'total', coalesce((select round(sum(remaining_try), 2) from open_docs where flow = 'out'), 0),
      'overdue', coalesce((select round(sum(remaining_try), 2) from open_docs where flow = 'out' and due_date < p_today), 0),
      'unplanned', coalesce((select count(*) from open_docs where flow = 'out' and due_date is null), 0)
    ),
    'vat', jsonb_build_object(
      'this_month', round((select this_month from vat), 2),
      'last_month', round((select last_month from vat), 2)
    ),
    'timeline', coalesce((
      select jsonb_agg(t order by t.due_date nulls last) from (
        select id, doc_type, number, due_date, flow, party, remaining_try as amount,
               case when due_date < p_today then p_today - due_date else 0 end as days_overdue
          from open_docs order by due_date nulls last limit 10) t), '[]'::jsonb),
    'sales_daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d::date, 'amount', coalesce(s.amt, 0)) order by d)
        from generate_series(p_today - 29, p_today, interval '1 day') d
        left join (
          select issue_date, sum(case when doc_type = 'sales_return' then -total_try else total_try end) as amt
            from public.documents
           where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
             and doc_type in ('sales_invoice','pos_sale','sales_return')
             and issue_date >= p_today - 29 and issue_date <= p_today
           group by issue_date) s on s.issue_date = d::date), '[]'::jsonb),
    'sales_monthly', coalesce((
      select jsonb_agg(jsonb_build_object('month', to_char(g, 'YYYY-MM'), 'amount', coalesce(s.amt, 0)) order by g)
        from generate_series(date_trunc('month', p_today) - interval '11 months', date_trunc('month', p_today), interval '1 month') g
        left join (
          select date_trunc('month', issue_date) as m,
                 sum(case when doc_type = 'sales_return' then -total_try else total_try end) as amt
            from public.documents
           where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
             and doc_type in ('sales_invoice','pos_sale','sales_return')
             and issue_date >= (date_trunc('month', p_today) - interval '11 months')::date
           group by 1) s on s.m = g),
    'top_products', coalesce((
      select jsonb_agg(t) from (
        select p.id, p.name, sum(l.quantity * l.unit_factor) as quantity, sum(l.net_amount * d.exchange_rate) as amount
          from public.document_lines l
          join public.documents d on d.id = l.document_id
          join public.products p on p.id = l.product_id
         where d.org_id = p_org and d.deleted_at is null and d.status not in ('draft','cancelled')
           and d.doc_type in ('sales_invoice','pos_sale') and d.issue_date >= v_month_start
         group by p.id, p.name order by amount desc limit 5) t), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(r order by r.at desc) from (
        (select 'document' as kind, d.id, d.doc_type as type, d.number, d.issue_date as date, d.created_at as at,
                coalesce(c.name, d.description) as party,
                case when d.doc_type in ('sales_invoice','pos_sale','purchase_return') then d.total_try else -d.total_try end as amount
           from public.documents d left join public.contacts c on c.id = d.contact_id
          where d.org_id = p_org and d.deleted_at is null
            and d.doc_type in ('sales_invoice','pos_sale','purchase_invoice','expense','sales_return','purchase_return','salary')
          order by d.created_at desc limit 8)
        union all
        (select 'transaction', t.id, t.type, null, t.txn_date, t.created_at,
                coalesce(c.name, e.name, t.description),
                case t.direction when 'in' then t.amount_try when 'out' then -t.amount_try else t.amount_try end
           from public.transactions t
           left join public.contacts c on c.id = t.contact_id
           left join public.employees e on e.id = t.employee_id
          where t.org_id = p_org and t.deleted_at is null
            and not exists (
              select 1 from public.payment_allocations pa
              join public.documents d on d.id = pa.document_id
              where pa.transaction_id = t.id and d.deleted_at is null
                and d.doc_type in ('expense', 'salary')
            )
          order by t.created_at desc limit 8)
        order by at desc limit 8) r), '[]'::jsonb),
    'critical_stock', coalesce((
      select jsonb_agg(t) from (
        select id, name, stock_qty, critical_stock from public.products
         where org_id = p_org and deleted_at is null and is_active and track_stock and type = 'product'
           and critical_stock is not null and stock_qty <= critical_stock
         order by stock_qty - critical_stock limit 12) t), '[]'::jsonb),
    'currency', jsonb_build_object(
      'sales_usd', (select coalesce(sum(total), 0) from public.documents where org_id = p_org and deleted_at is null
                      and currency = 'USD' and doc_type in ('sales_invoice','pos_sale') and issue_date >= v_month_start
                      and status not in ('draft','cancelled')),
      'sales_eur', (select coalesce(sum(total), 0) from public.documents where org_id = p_org and deleted_at is null
                      and currency = 'EUR' and doc_type in ('sales_invoice','pos_sale') and issue_date >= v_month_start
                      and status not in ('draft','cancelled')),
      'cash_usd', (select coalesce(sum(balance), 0) from public.accounts where org_id = p_org and deleted_at is null and currency = 'USD'),
      'cash_eur', (select coalesce(sum(balance), 0) from public.accounts where org_id = p_org and deleted_at is null and currency = 'EUR')
    ),
    'cash_flow', jsonb_build_object(
      'opening', round(v_cash, 2),
      'weeks', (select jsonb_agg(jsonb_build_object('week', week_no, 'start', week_start,
                                                    'in', inflow, 'out', outflow) order by week_no) from cash_flow)
    )
  ) into v_result;

  return v_result;
end;
$$;
