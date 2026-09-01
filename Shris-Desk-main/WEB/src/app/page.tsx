import { renderTemplate } from "@/lib/template";

export const runtime = "nodejs";

export default function Home() {
  const markup = renderTemplate("company.html");

  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: markup }} />
  );
}
