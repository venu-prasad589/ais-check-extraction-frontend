// The old System Admin address now opens Settings > Users (System Admin and Developer Portal were combined).
import { redirect } from "next/navigation";

export default function AdminRedirect() {
  redirect("/settings?tab=users");
}
