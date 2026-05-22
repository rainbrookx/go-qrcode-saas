import { redirect } from "next/navigation";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

export default async function UrldynRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const res = await fetch(`${BACKEND}/u/${code}`, { redirect: "manual" });

  if (res.status === 302 || res.status === 301) {
    const location = res.headers.get("location");
    if (location) {
      redirect(location);
    }
  }

  redirect("/");
}
