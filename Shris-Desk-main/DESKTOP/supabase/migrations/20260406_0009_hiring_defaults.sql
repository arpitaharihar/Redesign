update public.job_openings
set
  ats_keywords = coalesce(
    ats_keywords,
    trim(both ',' from lower(replace(title, ' ', ',')) || ',' || lower(coalesce(replace(department, ' ', ','), '')) || ',communication,problem solving,teamwork,collaboration')
  ),
  shortlist_email_subject = coalesce(shortlist_email_subject, 'Shortlisted for ' || title),
  shortlist_email_body = coalesce(
    shortlist_email_body,
    'Hi {{candidate_name}}, you have been shortlisted for ' || title || '. We will contact you for the next steps.'
  ),
  hire_email_subject = coalesce(hire_email_subject, 'Offer for ' || title),
  hire_email_body = coalesce(
    hire_email_body,
    'Hi {{candidate_name}}, congratulations! You have been hired for ' || title || '.'
  ),
  reject_email_subject = coalesce(reject_email_subject, 'Update on ' || title),
  reject_email_body = coalesce(
    reject_email_body,
    'Hi {{candidate_name}}, thanks for applying for ' || title || '. We will not be moving forward at this time.'
  )
where
  ats_keywords is null
  or shortlist_email_subject is null
  or shortlist_email_body is null
  or hire_email_subject is null
  or hire_email_body is null
  or reject_email_subject is null
  or reject_email_body is null;
