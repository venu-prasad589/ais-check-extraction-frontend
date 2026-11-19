// The old Batches address now opens Upload Checks, where the batch history is shown (the two tabs were combined).
import { redirect } from "next/navigation";

export default function BatchesRedirect() {
  redirect("/upload");
}
