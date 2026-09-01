export type TopicId = string;
export type TopicSource = "seed" | "hr" | "ai" | "upload";

export type Topic = {
  id: TopicId;
  title: string;
  shortTitle: string;
  minutes: string;
  osha: string;
  why: string;
  talkingPoints: string[];
  sideTitle: string;
  sideItems: string[];
  dos: string[];
  donts: string[];
  stopWork: string;
  pdf: string;
  source?: TopicSource;
  fileName?: string;
};

export function makeTopicId(title: string, existing: { id: string }[] = []) {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `topic-${Date.now()}`;
  if (!existing.some((t) => t.id === base)) return base;
  let n = 2;
  let id = `${base}-${n}`;
  while (existing.some((t) => t.id === id)) {
    n += 1;
    id = `${base}-${n}`;
  }
  return id;
}

export function linesToList(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*\d.]+\s*/, "").trim())
    .filter(Boolean);
}

export function topicPdfHref(pdf: string) {
  if (!pdf) return "";
  if (/^https?:\/\//.test(pdf) || pdf.startsWith("/api/")) return pdf;
  return pdf;
}

export const TOPICS: Topic[] = [
  {
    id: "ppe",
    title: "Personal Protective Equipment",
    shortTitle: "PPE",
    minutes: "5–10 minutes",
    osha: "OSHA 29 CFR 1910.132–138 · Hearing 1910.95 · Woodworking machines 1910.213",
    why: "In this shop, saws, CNC, sanders, and staplers throw chips and dust. PPE is the last backup after guards and dust collection. Wear what the job needs. Take damaged gear out of service.",
    talkingPoints: [
      "Safety glasses stay on in the shop — saws, CNC, sanding, and assembly throw chips, dust, and staples.",
      "Wear hearing protection at the saws, widebelt, edgebander, and CNC. If you have to raise your voice, put plugs or muffs in.",
      "No gloves at the table saw, shaper, jointer, or router. A glove can catch and pull your hand into the cutter (1910.213).",
      "Use cut-resistant gloves when you handle sheet stock, doors, or hardware — then take them off before you run a machine.",
      "Cracked glasses, torn gloves, or a dirty respirator do not protect you. Turn them in before you start.",
    ],
    sideTitle: "In this shop, wear",
    sideItems: [
      "Eyes: glasses with side shields in the shop. Add a face shield when changing a cutterhead.",
      "Hearing: plugs or muffs at loud machines for the whole run.",
      "Hands: right glove for sheets and hardware. None at spinning cutters.",
      "Feet: closed-toe work shoes. Panels and hardware drop.",
      "Dust / finish: only the mask or respirator you were trained to wear. A comfort dust mask is not a respirator (1910.134).",
      "Chemicals: gloves and eye protection on the SDS for glue, stain, and cleaner.",
    ],
    dos: [
      "Put glasses on before you walk into machining.",
      "Store clean PPE so the next shift can use it.",
      "Ask if the glue, finish, or machine setup changed.",
    ],
    donts: [
      "Do not take side shields off your glasses.",
      "Do not run a saw or sander with glasses around your neck.",
      "Do not share earplugs or a sweaty respirator.",
    ],
    stopWork:
      "Required PPE is missing or damaged, or someone says to skip glasses or hearing protection “just for this cut.” Get a supervisor.",
    pdf: "/OSHA_Safety_Meeting_PPE.pdf",
    source: "seed",
  },
  {
    id: "material-handling",
    title: "Material Handling",
    shortTitle: "Material handling",
    minutes: "5–10 minutes",
    osha: "OSHA 29 CFR 1910.176 (materials) · 1910.178 (forklifts / pallet jacks) · General Duty Clause",
    why: "We move 4x8 sheets, drawer boxes, cabinet parts, and doors all day. Most strains, crushed fingers, and struck-by injuries happen on those moves. Plan it. Use a cart. Keep aisles clear.",
    talkingPoints: [
      "Two people or a panel cart for a full sheet of plywood, MDF, or particleboard. Do not walk a sheet alone if you cannot see your feet.",
      "OSHA does not set one legal lift weight. If a stack of drawers or a door load is awkward, get help or a cart.",
      "Clear offcuts, hoses, and empty pallets before you pick anything up. Keep aisles and exits open (1910.176).",
      "Stack drawer boxes and doors so they cannot tip. Band or restack a leaning pile. Never pull from the middle of a sheet stack.",
      "Forklifts and powered pallet jacks: trained operators only. Stop, make eye contact, stay out from under the forks (1910.178).",
    ],
    sideTitle: "Before you move it",
    sideItems: [
      "Sheet stock: cart or two-person lift. Call the corner.",
      "Drawer boxes: on a cart, not stacked in your arms down the aisle.",
      "Doors and cabinet parts: do not lean them on a saw, edgebander, or CNC.",
      "Path clear? No cords, scrap, or wet glue on the floor.",
      "Will this stack still be stable after you set it down?",
      "Exits, panels, and fire gear still open?",
    ],
    dos: [
      "Bend at the knees. Keep the load close. Turn with your feet.",
      "Team-lift long doors and sheets. Say who walks backward.",
      "Set the brake on a cart before you load boxes or doors.",
    ],
    donts: [
      "Do not twist or throw parts onto a stack.",
      "Do not block aisles with sheet stock or door carts.",
      "Do not ride a pallet jack or walk under raised forks.",
    ],
    stopWork:
      "The sheet or door load is unstable, the aisle is blocked, the cart or jack is damaged, or you were not trained on that equipment. Stop and get help.",
    pdf: "/OSHA_Safety_Meeting_Material_Handling.pdf",
    source: "seed",
  },
];

export function getTopic(
  id: string | null | undefined,
  catalog: Topic[] = TOPICS,
) {
  return catalog.find((t) => t.id === id) ?? catalog[0] ?? TOPICS[0];
}

export function topicFromIntake(input: {
  title: string;
  source: TopicSource;
  why?: string;
  talkingPoints?: string;
  pdf?: string;
  fileName?: string;
  existing: Topic[];
}): Topic {
  const title = input.title.trim();
  return {
    id: makeTopicId(title, input.existing),
    title,
    shortTitle: title,
    minutes: "5–10 minutes",
    osha: "",
    why: (input.why ?? "").trim(),
    talkingPoints: linesToList(input.talkingPoints ?? ""),
    sideTitle: "",
    sideItems: [],
    dos: [],
    donts: [],
    stopWork: "",
    pdf: input.pdf ?? "",
    source: input.source,
    fileName: input.fileName,
  };
}
