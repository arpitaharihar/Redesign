import { readFileSync } from "fs";
import path from "path";

function getUrlMap() {
  const companyCode = process.env.NEXT_PUBLIC_COMPANY_CODE;
  const applyPath = companyCode ? `/apply?company=${companyCode}` : "/apply";

  return {
    index: "/",
    adminLogin: "/admin/login",
    register_applicant: applyPath,
    contact_form: "/api/contact",
    newsletter_signup: "/api/newsletter",
  };
}

function replaceStaticTags(markup: string) {
  return markup
    .replace(/{%\s*load static\s*%}/g, "")
    .replace(/{%\s*csrf_token\s*%}/g, "")
    .replace(/{% comment %}[\s\S]*?{%\s*endcomment\s*%}/g, "")
    .replace(/{%\s*if[\s\S]*?%}[\s\S]*?{%\s*endif\s*%}/g, "")
    .replace(/{%\s*for[\s\S]*?%}[\s\S]*?{%\s*endfor\s*%}/g, "")
    .replace(/{{[^}]+}}/g, "")
    .replace(/{%\s*static\s+'([^']+)'\s*%}/g, "/$1")
    .replace(/{%\s*static\s+\"([^\"]+)\"\s*%}/g, "/$1")
    .replace(/{%\s*url\s+'([^']+)'\s*%}/g, (_, key: string) => {
      const urlMap = getUrlMap();
      return urlMap[key as keyof typeof urlMap] ?? "#";
    })
    .replace(/\/chatbot\//g, "/api/chatbot/")
    .replace(/src=\"assets\//g, 'src="/assets/')
    .replace(/href=\"assets\//g, 'href="/assets/')
    .replace(/url\('assets\//g, "url('/assets/")
    .replace(/url\(\"assets\//g, 'url("/assets/');
}

function extractBody(markup: string) {
  const match = markup.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) {
    return markup;
  }
  return match[1];
}

export function renderTemplate(templateName: string) {
  try {
    const templatePath = path.join(process.cwd(), "src", "templates", templateName);
    const raw = readFileSync(templatePath, "utf8").replace(/\r\n/g, "\n");
    const normalized = replaceStaticTags(raw);
    return extractBody(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return `<div style="padding:24px;font-family:Arial,Helvetica,sans-serif;">
      <h2>Template Error</h2>
      <p>Unable to render company template.</p>
      <pre style="white-space:pre-wrap;">${message}</pre>
    </div>`;
  }
}
