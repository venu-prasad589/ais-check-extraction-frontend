// The old Developer Portal address now opens Settings > Developer Portal.
import { redirect } from "next/navigation";

export default function DeveloperRedirect() {
  redirect("/settings?tab=developer");
}
