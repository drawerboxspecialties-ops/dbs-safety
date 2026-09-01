import { redirect } from "next/navigation";

export default function TrainingRecordPage() {
  redirect("/meetings/sign-in?left=1");
}
