update public.job_openings
set
  shortlist_email_subject = coalesce(shortlist_email_subject, 'Shortlisted for {{opening_title}}'),
  shortlist_email_body = coalesce(
    shortlist_email_body,
    'Hi {{candidate_name}},\n\nGreat news — you have been shortlisted for {{opening_title}} at {{company_name}}.\nPlease keep an eye on the applicant portal for next steps.\n\nPortal: {{portal_url}}\n\nRegards,\nSmartDesk Hiring Team'
  ),
  hire_email_subject = coalesce(hire_email_subject, 'Offer for {{opening_title}}'),
  hire_email_body = coalesce(
    hire_email_body,
    'Hi {{candidate_name}},\n\nCongratulations! You have been selected for {{opening_title}} at {{company_name}}.\nYour temporary login password is: {{temp_password}}\nPlease sign in to the SmartDesk desktop app to complete onboarding.\n\nPortal: {{portal_url}}\n\nRegards,\nSmartDesk Hiring Team'
  ),
  reject_email_subject = coalesce(reject_email_subject, 'Update on {{opening_title}}'),
  reject_email_body = coalesce(
    reject_email_body,
    'Hi {{candidate_name}},\n\nThank you for applying for {{opening_title}} at {{company_name}}.\nWe will not be moving forward at this time, but we encourage you to apply again in the future.\n\nRegards,\nSmartDesk Hiring Team'
  )
where
  shortlist_email_subject is null
  or shortlist_email_body is null
  or hire_email_subject is null
  or hire_email_body is null
  or reject_email_subject is null
  or reject_email_body is null;
