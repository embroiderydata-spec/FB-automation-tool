import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect root URL directly to the dashboard
  redirect("/dashboard");
}
