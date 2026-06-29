create or replace view public.active_bans as
select
  b.*,
  case
    when coalesce(b.active, true) and b.until_date >= current_date then 'Active'
    else 'Expired'
  end as computed_status
from public.bans b
where coalesce(b.active, true) and b.until_date >= current_date;

create or replace view public.ban_history as
select
  b.*,
  case
    when coalesce(b.active, true) and b.until_date >= current_date then 'Active'
    else 'Expired'
  end as computed_status
from public.bans b
order by b.created_at desc;
