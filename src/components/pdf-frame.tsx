"use client";

import { useEffect, useState } from "react";
import { packetUrl } from "@/lib/packet";
import {
  isDataTopicFile,
  isIdbTopicFile,
  resolveTopicFileUrl,
} from "@/lib/topic-files";

export function PdfFrame({
  pdf,
  title,
  className,
}: {
  pdf: string;
  title: string;
  className?: string;
}) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    let objectUrl = "";
    setError("");
    setSrc("");

    async function load() {
      const href = packetUrl(pdf);
      if (!href) {
        if (live) setError("No PDF on this talk.");
        return;
      }
      try {
        if (isIdbTopicFile(pdf) || isDataTopicFile(pdf)) {
          objectUrl = await resolveTopicFileUrl(pdf);
          if (live) setSrc(objectUrl);
          return;
        }
        if (live) setSrc(href);
      } catch {
        if (live) setError("Could not open that PDF.");
      }
    }

    void load();
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdf]);

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }
  if (!src) {
    return <p className="text-sm text-muted-foreground">Loading PDF…</p>;
  }

  return (
    <iframe title={title} src={src} className={className} />
  );
}
