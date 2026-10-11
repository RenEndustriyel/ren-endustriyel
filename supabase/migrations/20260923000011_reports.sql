-- =====================================================================
-- 011 · Raporlar: gelir-gider/kârlılık, KDV, satış analizi, yaşlandırma
-- =====================================================================

-- Gelir-gider (TL, KDV hariç) — aylık
create or replace function public.report_income_expense(p_org uuid, p_from date, p_to date)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $$
declare v jsonb;
begin
  if not public.is_member(p_org) then raise exception 'Yetkisiz'; end if;
  with months as (
    select to_char(g, 'YYYY-MM') as m
      from generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month') g
  ),
  docs as (
    select to_char(issue_date, 'YYYY-MM') as m, doc_type, net_total * exchange_rate as net, category_id
      from public.documents
     where org_id = p_org and deleted_at is null and status not in ('draft','cancelled')
       and issue_date between p_from and p_to
  ),
  cogs as (
    select to_char(movement_date, 'YYYY-MM') as m,
           sum(-quantity * coalesce(unit_cost, 0)) filter (where movement_type = 'sale')
           - coalesce(sum(quantity * coalesce(unit_cost, 0)) filter (where movement_type = 'sales_return'), 0) as amt
      from public.stock_movements
     where org_id = p_org and deleted_at is null and movement_date between p_from and p_to
       and movement_type in ('sale','sales_return')
     group by 1
  ),
  agg as (
    select mo.m,
      coalesce(sum(d.net) filter (where d.doc_type in ('sales_invoice','pos_sale')), 0) as sales,
      coalesce(sum(d.net) filter (where d.doc_type = 'sales_return'), 0) as sales_returns,
      coalesce(sum(d.net) filter (where d.doc_type = 'purchase_invoice'), 0)
        - coalesce(sum(d.net) filter (where d.doc_type = 'purchase_return'), 0) as purchases,
      coalesce(sum(d.net) filter (where d.doc_type = 'expense'), 0) as expenses,
      coalesce(sum(d.net) filter (where d.doc_type = 'salary'), 0) as salaries
      from months mo left join docs d on d.m = mo.m
     group by mo.m
  )
  select jsonb_build_object(
    'months', coalesce((select jsonb_agg(jsonb_build_object(
        'month', a.m,
        'sales', round(a.sales, 2),
        'sales_returns', round(a.sales_returns, 2),
        'net_sales', round(a.sales - a.sales_returns, 2),
        'cogs', round(coalesce(c.amt, 0), 2),
        'gross_profit', round(a.sales - a.sales_returns - coalesce(c.amt, 0), 2),
        'purchases', round(a.purchases, 2),
        'expenses', round(a.expenses, 2),
        'salaries', round(a.salaries, 2),
        'net_profit', round(a.sales - a.sales_returns - coalesce(c.amt, 0) - a.expenses - a.salaries, 2)
      ) order by a.m) from agg a left join cogs c on c.m = a.m), '[]'::jsonb),
    'expense_categories', coalesce((select jsonb_agg(x order by x.amount desc) from (
        select coalesce(cat.name, 'Kategorisiz') as name, cat.color, round(sum(d.net), 2) as amount
          from docs d left join public.categories cat on cat.id = d.category_id
         where d.doc_type = 'expense'
         group by cat.name, cat.color) x), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

-- KDV raporu: aylık ve oran bazında hesaplanan / indirilecek
create or replace function public.report_vat(p_org uuid, p_from date, p_to date)
returns table (month text, vat_rate numeric, output_base numeric, output_vat numeric, input_base numeric, input_vat numeric)
language sql stable security invoker
set search_path = ''
as $$
  select to_char(d.issue_date, 'YYYY-MM'), l.vat_rate,
    round(sum(case when d.doc_type in ('sales_invoice','pos_sale') then l.net_amount
                   when d.doc_type = 'sales_return' then -l.net_amount else 0 end * d.exchange_rate), 2),
    round(sum(case when d.doc_type in ('sales_invoice','pos_sale') then l.vat_amount
                   when d.doc_type = 'sales_return' then -l.vat_amount else 0 end * d.exchange_rate), 2),
    round(sum(case when d.doc_type in ('purchase_invoice','expense') then l.net_amount
                   when d.doc_type = 'purchase_return' then -l.net_amount else 0 end * d.exchange_rate), 2),
    round(sum(case when d.doc_type in ('purchase_invoice','expense') then l.vat_amount
                   when d.doc_type = 'purchase_return' then -l.vat_amount else 0 end * d.exchange_rate), 2)
    from public.document_lines l
    join public.documents d on d.id = l.document_id
   where d.org_id = p_org and d.deleted_at is null and d.status not in ('draft','cancelled')
     and d.issue_date between p_from and p_to
     and d.doc_type in ('sales_invoice','pos_sale','sales_return','purchase_invoice','expense','purchase_return')
     and public.is_member(p_org)
   group by 1, 2
   order by 1, 2;
$$;

-- Satış analizi: müşteri / ürün / kategori bazında
create or replace function public.report_sales(p_org uuid, p_from date, p_to date, p_group text default 'product')
returns table (key uuid, name text, quantity numeric, net numeric, vat numeric, total numeric, cost numeric, profit numeric, doc_count bigint)
language sql stable security invoker
set search_path = ''
as $$
  with lines as (
    select d.id as doc_id, d.contact_id, l.product_id, p.category_id,
           coalesce(c.name, d.contact_snapshot->>'name', 'Perakende') as contact_name,
           coalesce(p.name, l.description, '—') as product_name,
           coalesce(cat.name, 'Kategorisiz') as category_name,
           case when d.doc_type = 'sales_return' then -1 else 1 end as sgn,
           l.quantity * l.unit_factor as qty,
           l.net_amount * d.exchange_rate as net, l.vat_amount * d.exchange_rate as vat,
           l.total_amount * d.exchange_rate as total,
           coalesce((select -sum(m.quantity * coalesce(m.unit_cost, 0)) from public.stock_movements m
                      where m.document_line_id = l.id and m.deleted_at is null), 0) as cost
      from public.document_lines l
      join public.documents d on d.id = l.document_id
      left join public.contacts c on c.id = d.contact_id
      left join public.products p on p.id = l.product_id
      left join public.categories cat on cat.id = p.category_id
     where d.org_id = p_org and d.deleted_at is null and d.status not in ('draft','cancelled')
       and d.doc_type in ('sales_invoice','pos_sale','sales_return')
       and d.issue_date between p_from and p_to
       and public.is_member(p_org)
  )
  select case p_group when 'contact' then contact_id when 'category' then category_id else product_id end,
         case p_group when 'contact' then contact_name when 'category' then category_name else product_name end,
         round(sum(sgn * qty), 3), round(sum(sgn * net), 2), round(sum(sgn * vat), 2), round(sum(sgn * total), 2),
         round(sum(cost), 2), round(sum(sgn * net) - sum(cost), 2), count(distinct doc_id)
    from lines
   group by 1, 2
   order by 4 desc;
$$;

-- Alacak / borç yaşlandırma (açık belgelerin kalan tutarı, vadeye göre)
create or replace function public.report_aging(p_org uuid, p_today date default current_date)
returns table (contact_id uuid, name text, flow text, not_due numeric, d0_30 numeric, d31_60 numeric, d61_90 numeric, d90_plus numeric, total numeric)
language sql stable security invoker
set search_path = ''
as $$
  with open_docs as (
    select d.contact_id, coalesce(c.name, '—') as name,
           case when d.doc_type in ('sales_invoice','pos_sale') then 'in' else 'out' end as flow,
           (d.total - d.paid_amount) * d.exchange_rate as remaining,
           p_today - coalesce(d.due_date, d.issue_date) as days
      from public.documents d
      left join public.contacts c on c.id = d.contact_id
     where d.org_id = p_org and d.deleted_at is null and d.status not in ('draft','cancelled')
       and d.doc_type in ('sales_invoice','pos_sale','purchase_invoice','expense')
       and d.payment_status in ('unpaid','partial') and d.contact_id is not null
       and public.is_member(p_org)
  )
  select contact_id, name, flow,
         round(sum(remaining) filter (where days <= 0), 2),
         round(sum(remaining) filter (where days between 1 and 30), 2),
         round(sum(remaining) filter (where days between 31 and 60), 2),
         round(sum(remaining) filter (where days between 61 and 90), 2),
         round(sum(remaining) filter (where days > 90), 2),
         round(sum(remaining), 2)
    from open_docs
   group by contact_id, name, flow
   order by flow, 9 desc;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.report_income_expense(uuid, date, date)',
    'public.report_vat(uuid, date, date)',
    'public.report_sales(uuid, date, date, text)',
    'public.report_aging(uuid, date)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
