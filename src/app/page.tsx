import Link from "next/link";
import { ClipboardCheck, FileText, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="sr-only">DBS Safety</h1>
      <Card className="mb-8 overflow-hidden border-[#003366]/15 shadow-sm">
        <CardHeader className="bg-[#003366] text-white">
          <p className="text-xs font-semibold tracking-[0.12em] text-amber-300">
            LIVE MODULE
          </p>
          <CardTitle className="text-2xl">Safety Meeting App</CardTitle>
          <CardDescription className="text-white/80">
            PPE or material handling talk, then a fillable attendance record.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div>
            <p className="font-medium">1. Set up</p>
            <p className="text-sm text-muted-foreground">
              Pick the date on a calendar, choose the topic, name the trainer.
            </p>
          </div>
          <div>
            <p className="font-medium">2. Give the talk</p>
            <p className="text-sm text-muted-foreground">
              One-page talking points written for this mill, CNC, and assembly floor.
            </p>
          </div>
          <div>
            <p className="font-medium">3. Sign in and file</p>
            <p className="text-sm text-muted-foreground">
              Names, signatures, and a written training record for the shop file.
            </p>
          </div>
          <div className="sm:col-span-3">
            <Link
              href="/meetings"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-[#003366] hover:bg-[#00264d]",
              )}
            >
              Open Safety Meeting App
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <FileText className="mb-1 size-5 text-[#003366]" />
            <CardTitle>PPE talk</CardTitle>
            <CardDescription>
              Glasses, hearing, no gloves at cutters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/meetings/talk?topic=ppe"
              className={buttonVariants({ variant: "outline" })}
            >
              Open talk
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <ClipboardCheck className="mb-1 size-5 text-[#003366]" />
            <CardTitle>Material handling talk</CardTitle>
            <CardDescription>
              Sheets, drawer boxes, doors, and carts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/meetings/talk?topic=material-handling"
              className={buttonVariants({ variant: "outline" })}
            >
              Open talk
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Users className="mb-1 size-5 text-[#003366]" />
            <CardTitle>Training sign-in</CardTitle>
            <CardDescription>
              Calendar date, signatures, trainer certification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/meetings/sign-in"
              className={buttonVariants({ variant: "outline" })}
            >
              Open sign-in
            </Link>
          </CardContent>
        </Card>
        <Card className="md:col-span-3">
          <CardHeader>
            <ClipboardCheck className="mb-1 size-5 text-[#003366]" />
            <CardTitle>Training record</CardTitle>
            <CardDescription>
              File copy: date, subject, who signed, who still needs the talk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/meetings/record"
              className={buttonVariants({ variant: "outline" })}
            >
              Open record
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
