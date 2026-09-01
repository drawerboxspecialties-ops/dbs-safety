import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tiles = [
  {
    href: "/meetings/talk?topic=ppe",
    title: "PPE talk",
    detail: "Glasses, hearing, no gloves at cutters.",
  },
  {
    href: "/meetings/talk?topic=material-handling",
    title: "Material handling",
    detail: "Sheets, doors, carts.",
  },
  {
    href: "/meetings/sign-in",
    title: "Sign-in",
    detail: "Names and signatures.",
  },
  {
    href: "/meetings/record",
    title: "Record",
    detail: "Who signed. Who still needs it.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
      <h1 className="sr-only">DBS Safety</h1>

      <section className="glass-panel rounded-3xl p-6 sm:p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Safety Meeting
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium text-cyan-700">01</p>
            <p className="mt-1 font-medium">Set up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Date, topic, trainer.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-cyan-700">02</p>
            <p className="mt-1 font-medium">Talk</p>
            <p className="mt-1 text-sm text-muted-foreground">
              One page for the floor.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-cyan-700">03</p>
            <p className="mt-1 font-medium">Sign and file</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Signatures, then the record.
            </p>
          </div>
        </div>
        <Link
          href="/meetings"
          className={cn(buttonVariants({ size: "lg" }), "mt-8")}
        >
          Open meeting
        </Link>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="glass-panel group rounded-2xl p-4 transition hover:-translate-y-0.5"
          >
            <p className="font-medium">{tile.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{tile.detail}</p>
            <p className="mt-4 text-sm text-cyan-800 group-hover:underline">
              Open
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
