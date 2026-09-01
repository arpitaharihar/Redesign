do $$
declare
  employee_record record;
  current_activity_date date;
  attendance_status_value public.attendance_status;
  late_minutes integer;
  work_minutes_value integer;
  punctuality_value integer;
  session_index integer;
  session_start timestamp;
  session_end timestamp;
  session_duration integer;
  project_choices uuid[];
  project_count integer;
begin
  for employee_record in
    select
      p.id,
      p.company_id,
      row_number() over (partition by p.company_id order by p.email)::int as employee_rank
    from public.profiles p
    where p.role = 'employee'
      and p.company_id is not null
  loop
    select array_agg(pr.id order by pr.created_at), count(*)
    into project_choices, project_count
    from public.projects pr
    where pr.company_id = employee_record.company_id;

    if project_count is null or project_count = 0 then
      project_choices := array[null::uuid];
      project_count := 1;
    end if;

    for current_activity_date in
      select gs::date
      from generate_series(date '2026-06-01', date '2026-06-30', interval '1 day') gs
      where extract(isodow from gs) <= 5
    loop
      attendance_status_value := case
        when ((employee_record.employee_rank + extract(day from current_activity_date)::int) % 19) = 0
          then 'leave'::public.attendance_status
        when ((employee_record.employee_rank + extract(day from current_activity_date)::int) % 13) = 0
          then 'late'::public.attendance_status
        when ((employee_record.employee_rank + extract(day from current_activity_date)::int) % 8) = 0
          then 'remote'::public.attendance_status
        else 'present'::public.attendance_status
      end;

      late_minutes := case
        when attendance_status_value = 'late' then 15 + ((employee_record.employee_rank * 5) % 21)
        else 1 + ((employee_record.employee_rank + extract(day from current_activity_date)::int) % 7)
      end;

      work_minutes_value := case attendance_status_value
        when 'leave' then 0
        else 438 + ((employee_record.employee_rank + extract(day from current_activity_date)::int) % 62)
      end;

      punctuality_value := case attendance_status_value
        when 'present' then greatest(84, 99 - late_minutes)
        when 'late' then greatest(55, 80 - late_minutes)
        when 'remote' then 89
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
        current_activity_date,
        attendance_status_value,
        case
          when attendance_status_value = 'leave' then null
          else timezone('utc', current_activity_date + time '09:00' + make_interval(mins => late_minutes))
        end,
        case
          when attendance_status_value = 'leave' then null
          else timezone('utc', current_activity_date + time '17:45' + make_interval(mins => work_minutes_value - 480))
        end,
        work_minutes_value,
        punctuality_value,
        case
          when attendance_status_value = 'leave' then 'Approved leave recorded for June dataset.'
          when attendance_status_value = 'remote' then 'Remote daily activity synced for June dataset.'
          when attendance_status_value = 'late' then 'Late arrival included in June activity baseline.'
          else 'Full workday activity captured for June dataset.'
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
        for session_index in 1..3 loop
          session_start := current_activity_date
            + case
                when session_index = 1 then time '09:20'
                when session_index = 2 then time '12:20'
                else time '15:10'
              end
            + make_interval(
                mins => case
                  when attendance_status_value = 'late' and session_index = 1 then late_minutes
                  else 0
                end
              );
          session_end := current_activity_date
            + case
                when session_index = 1 then time '11:55'
                when session_index = 2 then time '14:35'
                else time '18:05'
              end;
          session_duration := extract(epoch from (session_end - session_start))::integer / 60;

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
              current_activity_date,
              timezone('utc', session_start),
              timezone('utc', session_end),
              session_duration,
              greatest(0, session_duration - (12 + ((employee_record.employee_rank + session_index) % 18))),
              12 + ((employee_record.employee_rank + extract(day from current_activity_date)::int + session_index) % 18),
              least(98, 82 + ((employee_record.employee_rank + session_index + extract(day from current_activity_date)::int) % 14)),
              least(98, 80 + ((employee_record.employee_rank + session_index * 2 + extract(day from current_activity_date)::int) % 16)),
              case
                when attendance_status_value = 'remote' then 'remote_agent'
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
