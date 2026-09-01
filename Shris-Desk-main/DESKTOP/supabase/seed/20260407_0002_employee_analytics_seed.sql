insert into public.projects (company_id, name, client_name, status, budget_inr, start_date, due_date)
select c.id, 'Delivery Intelligence Suite', 'Axis Retail', 'active', 620000, current_date - 35, current_date + 45
from public.companies c
where c.code = 'NEXORA'
  and not exists (
    select 1
    from public.projects p
    where p.company_id = c.id
      and p.name = 'Delivery Intelligence Suite'
  );

insert into public.projects (company_id, name, client_name, status, budget_inr, start_date, due_date)
select c.id, 'Client Health Tracker', 'Northwind Foods', 'active', 540000, current_date - 21, current_date + 60
from public.companies c
where c.code = 'NEXORA'
  and not exists (
    select 1
    from public.projects p
    where p.company_id = c.id
      and p.name = 'Client Health Tracker'
  );

insert into public.projects (company_id, name, client_name, status, budget_inr, start_date, due_date)
select c.id, 'Ops Visibility Dashboard', 'Meridian Labs', 'active', 470000, current_date - 18, current_date + 52
from public.companies c
where c.code = 'VERTEX'
  and not exists (
    select 1
    from public.projects p
    where p.company_id = c.id
      and p.name = 'Ops Visibility Dashboard'
  );

insert into public.projects (company_id, name, client_name, status, budget_inr, start_date, due_date)
select c.id, 'Retention Insights Hub', 'OpenCart Plus', 'planned', 395000, current_date + 4, current_date + 84
from public.companies c
where c.code = 'VERTEX'
  and not exists (
    select 1
    from public.projects p
    where p.company_id = c.id
      and p.name = 'Retention Insights Hub'
  );

do $$
declare
  employee_record record;
  current_attendance_date date;
  project_choices uuid[];
  project_count integer;
  company_admin_id uuid;
  active_project_id uuid;
  current_task_id uuid;
  task_title text;
  task_status public.task_status;
  task_priority public.task_priority;
  submission_status public.submission_review_status;
  attendance_status_value public.attendance_status;
  work_minutes_value integer;
  punctuality_value integer;
  late_minutes integer;
  remote_flag boolean;
  task_index integer;
  session_index integer;
  session_start timestamp;
  session_end timestamp;
  session_duration integer;
  session_focus integer;
  session_activity integer;
  task_due_date date;
  email_token text;
begin
  for employee_record in
    select
      p.id,
      p.email,
      p.full_name,
      p.company_id,
      row_number() over (partition by p.company_id order by p.created_at, p.email)::int as employee_rank
    from public.profiles p
    where p.role = 'employee'
      and p.company_id is not null
    order by p.company_id, p.created_at, p.email
  loop
    email_token := initcap(split_part(employee_record.email, '@', 1));

    select pr.id
    into company_admin_id
    from public.profiles pr
    where pr.company_id = employee_record.company_id
      and pr.role = 'company_admin'
    order by pr.created_at
    limit 1;

    select array_agg(project_id order by project_order)
    into project_choices
    from (
      select p.id as project_id, row_number() over (order by p.created_at, p.name) as project_order
      from public.projects p
      where p.company_id = employee_record.company_id
      order by p.created_at, p.name
      limit 3
    ) ranked_projects;

    project_count := coalesce(array_length(project_choices, 1), 0);
    if project_count = 0 then
      continue;
    end if;

    for task_index in 1..least(project_count, 2) loop
      insert into public.project_members (company_id, project_id, profile_id, role_in_project)
      values (
        employee_record.company_id,
        project_choices[task_index],
        employee_record.id,
        case
          when task_index = 1 then 'Developer'
          else 'Contributor'
        end
      )
      on conflict (project_id, profile_id) do nothing;
    end loop;

    for task_index in 1..4 loop
      active_project_id := project_choices[1 + ((employee_record.employee_rank + task_index - 2) % project_count)];
      task_title := format('%s Deliverable %s', email_token, task_index);
      task_status := case task_index
        when 1 then 'done'::public.task_status
        when 2 then 'review'::public.task_status
        when 3 then 'in_progress'::public.task_status
        else 'todo'::public.task_status
      end;
      task_priority := case task_index
        when 1 then 'medium'::public.task_priority
        when 2 then 'high'::public.task_priority
        when 3 then 'critical'::public.task_priority
        else 'medium'::public.task_priority
      end;
      task_due_date := case task_index
        when 1 then current_date - ((employee_record.employee_rank % 3) + 1)
        when 2 then current_date + 2 + employee_record.employee_rank
        when 3 then current_date + 5 + employee_record.employee_rank
        else current_date - 1
      end;

      select t.id
      into current_task_id
      from public.tasks t
      where t.assignee_profile_id = employee_record.id
        and t.title = task_title
      limit 1;

      if current_task_id is null then
        insert into public.tasks (
          company_id,
          project_id,
          assignee_profile_id,
          title,
          description,
          status,
          priority,
          due_date
        )
        values (
          employee_record.company_id,
          active_project_id,
          employee_record.id,
          task_title,
          format(
            'Track delivery quality, reporting, and stakeholder updates for %s.',
            coalesce(employee_record.full_name, employee_record.email)
          ),
          task_status,
          task_priority,
          task_due_date
        )
        returning id into current_task_id;
      else
        update public.tasks
        set project_id = active_project_id,
            status = task_status,
            priority = task_priority,
            due_date = task_due_date
        where id = current_task_id;
      end if;

      if task_index <= 3 then
        submission_status := case
          when task_index = 1 then 'accepted'::public.submission_review_status
          when task_index = 2 then 'submitted'::public.submission_review_status
          when employee_record.employee_rank % 4 = 0 then 'rejected'::public.submission_review_status
          else 'needs_changes'::public.submission_review_status
        end;

        if not exists (
          select 1
          from public.task_submissions ts
          where ts.task_id = current_task_id
            and ts.profile_id = employee_record.id
        ) then
          insert into public.task_submissions (
            task_id,
            profile_id,
            submission_url,
            notes,
            status,
            reviewed_at,
            reviewer_profile_id,
            feedback,
            created_at
          )
          values (
            current_task_id,
            employee_record.id,
            format('https://deliverables.smartdesk.local/%s/task-%s', lower(email_token), task_index),
            case
              when submission_status = 'accepted' then 'Delivered with client-ready documentation.'
              when submission_status = 'submitted' then 'Awaiting lead review and QA notes.'
              when submission_status = 'rejected' then 'Initial delivery had validation gaps.'
              else 'Updated build shared for correction cycle.'
            end,
            submission_status,
            case
              when submission_status = 'submitted' then null
              else timezone('utc', now()) - make_interval(days => task_index + employee_record.employee_rank)
            end,
            case
              when submission_status = 'submitted' then null
              else company_admin_id
            end,
            case
              when submission_status = 'accepted' then 'Accepted. Good structure and clean handoff.'
              when submission_status = 'rejected' then 'Rejected. Please resolve missing evidence and retest.'
              when submission_status = 'needs_changes' then 'Needs changes. Improve validation notes and edge-case handling.'
              else null
            end,
            timezone('utc', now()) - make_interval(days => task_index + employee_record.employee_rank + 1)
          );
        end if;
      end if;
    end loop;

    for current_attendance_date in
      select gs::date
      from generate_series(current_date - 20, current_date, interval '1 day') gs
      where extract(isodow from gs) <= 5
    loop
      attendance_status_value := case
        when ((employee_record.employee_rank + extract(day from current_attendance_date)::int) % 17) = 0
          then 'leave'::public.attendance_status
        when ((employee_record.employee_rank + extract(day from current_attendance_date)::int) % 11) = 0
          then 'late'::public.attendance_status
        when ((employee_record.employee_rank + extract(day from current_attendance_date)::int) % 7) = 0
          then 'remote'::public.attendance_status
        else 'present'::public.attendance_status
      end;

      late_minutes := case
        when attendance_status_value = 'late' then 18 + ((employee_record.employee_rank * 3) % 17)
        else 2 + ((employee_record.employee_rank + extract(day from current_attendance_date)::int) % 8)
      end;
      remote_flag := attendance_status_value = 'remote';

      work_minutes_value := case attendance_status_value
        when 'leave' then 0
        else 440 + ((employee_record.employee_rank + extract(day from current_attendance_date)::int) % 55)
      end;

      punctuality_value := case attendance_status_value
        when 'present' then greatest(84, 98 - late_minutes)
        when 'late' then greatest(58, 82 - late_minutes)
        when 'remote' then 88
        else 100
      end;

      insert into public.employee_attendance (
        company_id,
        profile_id,
        attendance_date,
        status,
        check_in_at,
        check_out_at,
        work_minutes,
        punctuality_score,
        notes
      )
      values (
        employee_record.company_id,
        employee_record.id,
        current_attendance_date,
        attendance_status_value,
        case
         when attendance_status_value = 'leave' then null
          else timezone(
            'utc',
            current_attendance_date + time '09:00' + make_interval(mins => late_minutes)
          )
        end,
        case
          when attendance_status_value = 'leave' then null
          else timezone(
            'utc',
            current_attendance_date + time '17:45' + make_interval(mins => work_minutes_value - 480)
          )
        end,
        work_minutes_value,
        punctuality_value,
        case
          when attendance_status_value = 'leave' then 'Approved personal leave.'
          when remote_flag then 'Remote work session synced from desktop agent.'
          when attendance_status_value = 'late' then 'Late arrival recorded.'
          else 'Healthy workday completion.'
        end
      )
      on conflict (profile_id, attendance_date) do update
      set status = excluded.status,
          check_in_at = excluded.check_in_at,
          check_out_at = excluded.check_out_at,
          work_minutes = excluded.work_minutes,
          punctuality_score = excluded.punctuality_score,
          notes = excluded.notes;

      if attendance_status_value <> 'leave' then
        for session_index in 1..2 loop
          session_start := current_attendance_date
            + case
                when session_index = 1 then time '09:25'
                else time '14:00'
              end
            + make_interval(mins => case when attendance_status_value = 'late' and session_index = 1 then late_minutes else 0 end);
          session_end := current_attendance_date
            + case
                when session_index = 1 then time '13:00'
                else time '18:00'
              end;
          session_duration := extract(epoch from (session_end - session_start))::integer / 60;
          session_focus := least(
            97,
            case
              when attendance_status_value = 'late' then 72
              when remote_flag then 84
              else 88
            end + ((employee_record.employee_rank + session_index) % 8)
          );
          session_activity := least(
            96,
            case
              when attendance_status_value = 'late' then 70
              when remote_flag then 82
              else 86
            end + ((extract(day from current_attendance_date)::int + session_index) % 9)
          );

          if not exists (
            select 1
            from public.employee_work_sessions ews
            where ews.profile_id = employee_record.id
              and ews.started_at = timezone('utc', session_start)
          ) then
            insert into public.employee_work_sessions (
              company_id,
              profile_id,
              project_id,
              session_date,
              started_at,
              ended_at,
              duration_minutes,
              productive_minutes,
              idle_minutes,
              focus_score,
              activity_score,
              source
            )
            values (
              employee_record.company_id,
              employee_record.id,
              project_choices[1 + ((session_index + employee_record.employee_rank - 1) % project_count)],
              current_attendance_date,
              timezone('utc', session_start),
              timezone('utc', session_end),
              session_duration,
              greatest(0, session_duration - (18 + ((employee_record.employee_rank + session_index) % 22))),
              18 + ((employee_record.employee_rank + extract(day from current_attendance_date)::int + session_index) % 22),
              session_focus,
              session_activity,
              case
                when remote_flag then 'remote_agent'
                else 'desktop_agent'
              end
            );
          end if;
        end loop;
      end if;
    end loop;
  end loop;
end
$$;
