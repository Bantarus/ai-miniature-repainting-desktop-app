// AUTO-SEEDED from Black Forest Labs / r/minipainting research (see DESIGN doc).
// Named tabletop-miniature paint schemes used to seed the template palette UI.
// Hex values approximate the real hobby paints (Citadel / Vallejo / Army Painter).

export type ColorRole = "base" | "shade" | "highlight" | "metal" | "accent";

export interface PaletteColor {
  name: string;
  hex: string;
  role: ColorRole;
}

export interface TemplatePalette {
  name: string;
  description: string;
  technique: string;
  colors: PaletteColor[];
}

export const TEMPLATE_PALETTES: TemplatePalette[] = [
  {
    name: "Ultramarines Blue",
    description: "Classic cool-blue Space Marine power armor; the default 'beginner-friendly' 40k scheme.",
    technique: "Base + shade + edge highlight",
    colors: [
    { name: "Macragge Blue", hex: "#0F3D6E", role: "base" },
    { name: "Drakenhof Nightshade (recess)", hex: "#10243F", role: "shade" },
    { name: "Calgar Blue", hex: "#2D6FB0", role: "highlight" },
    { name: "Fenrisian Grey", hex: "#8FB7D6", role: "highlight" },
    { name: "Retributor Gold (trim)", hex: "#B6893B", role: "metal" },
    ],
  },
  {
    name: "Blood Angels Crimson",
    description: "Deep, vibrant red angelic Space Marines with gold trim and black detailing.",
    technique: "Base + glaze shade + layered highlights",
    colors: [
    { name: "Mephiston Red", hex: "#9A1115", role: "base" },
    { name: "Carroburg Crimson (shade)", hex: "#5A0A14", role: "shade" },
    { name: "Evil Sunz Scarlet", hex: "#C8232A", role: "highlight" },
    { name: "Wild Rider Red", hex: "#E2522B", role: "highlight" },
    { name: "Auric Armour Gold (trim)", hex: "#C49A4A", role: "metal" },
    ],
  },
  {
    name: "Dark Angels Green",
    description: "Somber deep-green knightly armor of the Unforgiven, bone and gold accents.",
    technique: "Base + wash + edge highlight",
    colors: [
    { name: "Caliban Green", hex: "#11472A", role: "base" },
    { name: "Nuln Oil (recess)", hex: "#0A1A10", role: "shade" },
    { name: "Warpstone Glow", hex: "#2F8C3B", role: "highlight" },
    { name: "Moot Green (edge)", hex: "#54C24A", role: "highlight" },
    { name: "Ushabti Bone (robes)", hex: "#C7BD8F", role: "accent" },
    ],
  },
  {
    name: "Necron Living Metal",
    description: "Cold gunmetal endoskeleton with glowing eldritch-green energy; fast 3-step metal.",
    technique: "Metallic base + wash + green OSL glow",
    colors: [
    { name: "Leadbelcher", hex: "#5B5F61", role: "metal" },
    { name: "Nuln Oil (wash)", hex: "#1B1D1E", role: "shade" },
    { name: "Runefang Steel (edge)", hex: "#C9CDCF", role: "highlight" },
    { name: "Warpstone Glow (rods)", hex: "#2FA13C", role: "accent" },
    { name: "Tesseract/Hexwraith Glow (tips)", hex: "#7FE36A", role: "highlight" },
    ],
  },
  {
    name: "Death Guard Plague",
    description: "Rotted, diseased pale-green armor of Nurgle with rust, grime, and slime.",
    technique: "Base + wash + rust/weathering",
    colors: [
    { name: "Death Guard Green", hex: "#7E8A5C", role: "base" },
    { name: "Seraphim Sepia / Agrax (shade)", hex: "#54502E", role: "shade" },
    { name: "Nurgling Green (highlight)", hex: "#A7B07A", role: "highlight" },
    { name: "Ryza Rust", hex: "#C26A2A", role: "accent" },
    { name: "Typhus Corrosion (grime)", hex: "#2E2A22", role: "accent" },
    { name: "Nurgle's Rot (slime)", hex: "#9CB05A", role: "accent" },
    ],
  },
  {
    name: "Stormcast NMM Gold",
    description: "Heroic Sigmarite gold armor rendered as non-metallic metal (painted reflections).",
    technique: "NMM gold",
    colors: [
    { name: "Rhinox Hide (shadow)", hex: "#3A2B26", role: "shade" },
    { name: "Balor / Oak Brown (base)", hex: "#7A5A1E", role: "base" },
    { name: "Zamesi Desert (mid)", hex: "#B98F38", role: "highlight" },
    { name: "Dorn/Sun Yellow (light)", hex: "#E8C24A", role: "highlight" },
    { name: "White Scar (hotspot)", hex: "#F4F1E6", role: "highlight" },
    ],
  },
  {
    name: "Stormcast Metallic Gold",
    description: "Fast true-metallic gold for Stormcast Eternals using the classic GW recipe.",
    technique: "Metallic base + wash + edge highlight",
    colors: [
    { name: "Retributor Armour", hex: "#A8702A", role: "metal" },
    { name: "Reikland Fleshshade (wash)", hex: "#6E3A1C", role: "shade" },
    { name: "Auric Armour Gold", hex: "#C49A4A", role: "highlight" },
    { name: "Liberator Gold", hex: "#D8B25C", role: "highlight" },
    { name: "Stormhost Silver (edge)", hex: "#E3E0D2", role: "metal" },
    ],
  },
  {
    name: "T'au Sept Ochre",
    description: "Sandy ochre battlesuit armor with bone panels and dark recesses; clean sci-fi look.",
    technique: "Base + wash + layer highlight",
    colors: [
    { name: "Tallarn Sand", hex: "#A98B52", role: "base" },
    { name: "Agrax Earthshade (shade)", hex: "#4E3A22", role: "shade" },
    { name: "Tau Light Ochre", hex: "#C99A3F", role: "highlight" },
    { name: "Ushabti Bone (panels)", hex: "#C7BD8F", role: "accent" },
    { name: "Screaming Skull (edge)", hex: "#DDD7B0", role: "highlight" },
    ],
  },
  {
    name: "Tyranid Leviathan",
    description: "Purple carapace over pale bone flesh with crimson tongues; iconic Hive Fleet.",
    technique: "Contrast over zenithal / layered",
    colors: [
    { name: "Wraithbone / Skeleton Horde (flesh)", hex: "#C9C0A0", role: "base" },
    { name: "Naggaroth Night (carapace base)", hex: "#33274A", role: "shade" },
    { name: "Xereus Purple", hex: "#5C3186", role: "base" },
    { name: "Genestealer Purple (edge)", hex: "#9466C4", role: "highlight" },
    { name: "Screamer Pink (tongues/claws)", hex: "#8A1B45", role: "accent" },
    ],
  },
  {
    name: "Slapchop Contrast",
    description: "Black-to-white zenithal undercoat brought to life with one coat of Contrast/Speedpaint.",
    technique: "Zenithal / slapchop",
    colors: [
    { name: "Corax/Matt Black (shadow)", hex: "#181818", role: "shade" },
    { name: "Mechanicus/Standard Grey (mid)", hex: "#6E7173", role: "base" },
    { name: "White Scar drybrush", hex: "#F2F1EC", role: "highlight" },
    { name: "Contrast colour (single coat)", hex: "#7A2E8C", role: "accent" },
    ],
  },
  {
    name: "NMM Cold Steel",
    description: "Painted (non-metallic) silver/steel using greys with a cool blue cast.",
    technique: "NMM silver",
    colors: [
    { name: "Abaddon Black (shadow)", hex: "#141618", role: "shade" },
    { name: "Basalt / Eshin Grey (base)", hex: "#454B50", role: "base" },
    { name: "Dawnstone (mid)", hex: "#7E868B", role: "highlight" },
    { name: "Blue glaze (cool reflection)", hex: "#2C4E73", role: "accent" },
    { name: "White Scar (hotspot)", hex: "#F4F4F2", role: "highlight" },
    ],
  },
  {
    name: "Rust & Ruin Weathering",
    description: "Corroded oxidized-metal palette for vehicles, terrain, and battle-worn armor.",
    technique: "Sponge + stipple weathering",
    colors: [
    { name: "Leadbelcher (bare metal)", hex: "#5B5F61", role: "metal" },
    { name: "Rhinox Hide / burnt umber (deep rust)", hex: "#3A2520", role: "shade" },
    { name: "Skrag Brown (mid rust)", hex: "#8A4A22", role: "base" },
    { name: "Ryza Rust (bright orange)", hex: "#C26A2A", role: "highlight" },
    { name: "Fire Dragon Bright (rust spark)", hex: "#E08A3C", role: "highlight" },
    ],
  },
  {
    name: "Plasma OSL Glow",
    description: "Blue-white object source lighting for plasma coils, screens, and energy weapons.",
    technique: "OSL / glow",
    colors: [
    { name: "Kantor/Macragge Blue (outer)", hex: "#16335E", role: "shade" },
    { name: "Teclis/Calgar Blue (mid)", hex: "#2E7AC0", role: "base" },
    { name: "Lothern/Baharroth Blue (inner)", hex: "#5FB2E6", role: "highlight" },
    { name: "Blue Horror (near core)", hex: "#AED6EE", role: "highlight" },
    { name: "White Scar (source core)", hex: "#FFFFFF", role: "highlight" },
    ],
  },
  {
    name: "Warm Human Skin",
    description: "Caucasian flesh from ruddy shadow to pale highlight for heroes and troops.",
    technique: "Base + wash + layer highlight",
    colors: [
    { name: "Bugman's Glow", hex: "#9A5848", role: "base" },
    { name: "Reikland Fleshshade (wash)", hex: "#5C3322", role: "shade" },
    { name: "Cadian Fleshtone", hex: "#C07C5E", role: "highlight" },
    { name: "Kislev Flesh", hex: "#D9A57C", role: "highlight" },
    { name: "Flayed One Flesh (top)", hex: "#E6C39C", role: "highlight" },
    ],
  },
  {
    name: "Dark Human Skin",
    description: "Deep warm-brown skin with red undertones, highlighted toward tan.",
    technique: "Base + wash + layer highlight",
    colors: [
    { name: "Dryad Bark (shadow)", hex: "#2E241F", role: "shade" },
    { name: "Catachan Fleshtone (base)", hex: "#5A3B2C", role: "base" },
    { name: "Agrax Earthshade (wash)", hex: "#3A2A1C", role: "shade" },
    { name: "Cadian Fleshtone (highlight)", hex: "#9A6A4C", role: "highlight" },
    { name: "Kislev Flesh (top)", hex: "#C79064", role: "highlight" },
    ],
  },
  {
    name: "Nurgle Daemon Flesh",
    description: "Sickly green-brown daemon skin with pink bruising and glossy rot for Nurgle units.",
    technique: "Base + wash + glaze accent",
    colors: [
    { name: "Death Guard Green (base)", hex: "#7E8A5C", role: "base" },
    { name: "Athonian Camoshade (wash)", hex: "#5A5A2E", role: "shade" },
    { name: "Nurgling Green (highlight)", hex: "#A7B07A", role: "highlight" },
    { name: "Pink Horror (bruise/bubo)", hex: "#B0508C", role: "accent" },
    { name: "Nurgle's Rot (gloss rot)", hex: "#9CB05A", role: "accent" },
    ],
  },
];
