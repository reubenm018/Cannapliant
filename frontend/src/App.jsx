import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';

const PRODUCT_TYPES = [
  { id: "edibles", label: "Edibles", icon: "🍪", desc: "Cannabis-infused edible products" },
  { id: "mfg_vape", label: "Vapes / All-in-Ones / Concentrates / Infused Pre-Rolls", icon: "💨", desc: "Manufactured vape cartridges, AIOs, concentrates & infused pre-rolls" },
  { id: "non_mfg", label: "Flower / Non-Infused Pre-Rolls", icon: "🌿", desc: "Non-manufactured cannabis flower & pre-rolls" },
];


// ── Embedded regulatory checklists derived from DCC regs ──
const CHECKLISTS = {
  edibles: {
    title: "MFG - Edibles Labeling Checklist",
    reference: "CCR Title 4 Div. 19, DCC Chapter 11 Art. 3 §§17403–17410",
    sections: [
      { name: "General Requirements", items: [
        { id: "e1a", text: "Required information is in English", reg: "§17402(a)", severity: "high" },
        { id: "e1b", text: "Label is easy to read / unobstructed and conspicuous", reg: "§17402(b)", severity: "high" },
        { id: "e1c", text: "All required information on outermost packaging", reg: "§17402(c)", severity: "high" },
      ]},
      { name: "Primary Panel", items: [
        { id: "e2a", text: "Primary label identifies the product", reg: "§17404(a)(1)", severity: "high" },
        { id: "e2b", text: "Net weight in BOTH metric and US customary units", reg: "§17404(a)(3)", severity: "high" },
        { id: "e2c", text: "Universal symbol (CA cannabis leaf) at least 0.5\" height", reg: "§17410", severity: "critical" },
        { id: "e2d", text: "'cannabis-infused' or 'cannabis infused' in bold above product identity, larger text size", reg: "§17405(a)", severity: "critical" },
        { id: "e2e", text: "All text at least 6pt font (~2.17mm)", reg: "§17404(a)", severity: "medium" },
      ]},
      { name: "Informational Panel", items: [
        { id: "e3a", text: "Name of the Licensee (manufacturer)", reg: "§17406(a)(1)", severity: "high" },
        { id: "e3b", text: "Packaging Date", reg: "§17406(a)(2)", severity: "high" },
        { id: "e3c", text: "Government Warning statement in bold caps (full text required)", reg: "§17406(a)(3)", severity: "critical" },
        { id: "e3d", text: "'FOR MEDICAL USE ONLY' if THC exceeds adult-use limits (§17304)", reg: "§17406(a)(4)", severity: "critical" },
        { id: "e3e", text: "Ingredients list in descending order of predominance", reg: "§17406(a)(5)", severity: "high" },
        { id: "e3f", text: "'Contains' + major food allergens listed (if applicable)", reg: "§17406(a)(6)", severity: "high" },
        { id: "e3g", text: "Artificial colorings named (if applicable)", reg: "§17406(a)(7)", severity: "medium" },
        { id: "e3g2", text: "Sodium, sugar, carbohydrates, total fat per serving (g or mg)", reg: "§17406(a)(8)", severity: "high" },
        { id: "e3h", text: "Instructions for use/consumption", reg: "§17406(a)(9)", severity: "medium" },
        { id: "e3i", text: "Product UID", reg: "§17406(a)(10)", severity: "critical" },
        { id: "e3j", text: "Batch number", reg: "§17406(a)(11)", severity: "critical" },
        { id: "e3k", text: "'KEEP REFRIGERATED' or 'REFRIGERATE AFTER OPENING' if applicable", reg: "§17406(a)(12)", severity: "medium" },
        { id: "e3l", text: "All informational panel text at least 6pt font", reg: "§17406(b)", severity: "medium" },
      ]},
      { name: "Cannabinoid Content", items: [
        { id: "e4a", text: "Cannabinoid content on Primary or Informational Panel", reg: "§17407(a)", severity: "critical" },
        { id: "e4b", text: "THC and CBD in mg per serving AND mg per package (for edibles with servings)", reg: "§17407(b)(1)", severity: "critical" },
        { id: "e4c", text: "If THC/CBD < 2mg, stated as '<2 mg per serving' or '<2 mg per package'", reg: "§17407(c)", severity: "high" },
        { id: "e4d", text: "After COA: cannabinoids ≥5% of total listed with percentages", reg: "§17407(d)(1)", severity: "high" },
        { id: "e4e", text: "After COA: labeled amounts match COA (may round to nearest whole number)", reg: "§17407(d)(2)", severity: "critical" },
        { id: "e4f", text: "THC per serving does not exceed 10mg (adult-use)", reg: "§17304", severity: "critical" },
        { id: "e4g", text: "THC per package does not exceed 100mg (adult-use)", reg: "§17304", severity: "critical" },
        { id: "e4h", text: "Cannabinoid label affixed to outermost packaging, does not obstruct other info", reg: "§17407(d)(3)", severity: "high" },
      ]},
      { name: "Labeling Restrictions", items: [
        { id: "e5a", text: "No misleading California city/county name (unless 100% from there)", reg: "§17408(a)(1)", severity: "high" },
        { id: "e5b", text: "Content NOT attractive to individuals under 21", reg: "§17408(a)(2)", severity: "critical" },
        { id: "e5c", text: "No untrue or misleading health-related statements", reg: "§17408(a)(3)", severity: "critical" },
        { id: "e5d", text: "No false or misleading information of any kind", reg: "§17408(a)(5)", severity: "critical" },
        { id: "e5e", text: "No picture of the edible product on packaging exterior", reg: "§17408(a)(4)", severity: "high" },
        { id: "e5f", text: "No 'organic' / 'organix' claims unless USDA NOP authorized for cannabis", reg: "§17408(a)(5)(A)", severity: "high" },
        { id: "e5g", text: "No 'OCal' or 'OCal certified' claims unless product meets B&P §26062 program requirements", reg: "§17408(a)(5)(B)", severity: "high" },
        { id: "e5h", text: "No appellation of origin claim unless product meets B&P §26063 program requirements", reg: "§17408(a)(6)", severity: "medium" },
      ]},
      { name: "Anticipated Effects (§17409 — If Used)", items: [
        { id: "e6ae", text: "If anticipated effects are stated, they describe physiological effects only (e.g., 'may cause drowsiness'), NOT health benefit or therapeutic claims", reg: "§17409(a)", severity: "critical" },
        { id: "e6bf", text: "If anticipated effects are stated, licensee has substantiation that the information is truthful and not misleading", reg: "§17409(a)", severity: "high" },
        { id: "e6cf", text: "Anticipated effects statement located on informational panel or supplemental labeling (not primary panel)", reg: "§17409(a)", severity: "low" },
      ]},
      { name: "Prop 65 Warning", items: [
        { id: "e6a", text: "Prop 65 warning: 'WARNING: Consuming this product during pregnancy exposes your child to delta-9-THC...'", reg: "CA Prop 65", severity: "critical" },
        { id: "e6b", text: "Prop 65 warning symbol (triangle with !) next to 'WARNING:'", reg: "CA Prop 65", severity: "high" },
        { id: "e6c", text: "Prop 65 symbol at least same height as word 'WARNING'", reg: "CA Prop 65", severity: "medium" },
      ]},
      { name: "Internal Requirements", items: [
        { id: "e7a", text: "Expiration date present (required for edibles)", reg: "Internal/Best Practice", severity: "high" },
        { id: "e7b", text: "THC in mg per package AND mg per serving format", reg: "Internal Memo", severity: "high" },
        { id: "e7c", text: "CBD in mg per package AND mg per serving format", reg: "Internal Memo", severity: "high" },
        { id: "e7d", text: "Licensee contact info present", reg: "Internal Memo", severity: "medium" },
        { id: "e7e", text: "Space reserved for additional cannabinoid >5% (relabeling contingency)", reg: "Internal Best Practice", severity: "low" },
      ]},
      { name: "LADCR Requirements (City of LA)", items: [
        { id: "e8a", text: "No deceptive, false, or misleading statements on any product label or customer-facing document", reg: "LADCR Reg 5(A)(1)(xi)", severity: "critical" },
        { id: "e8b", text: "Product is fully labeled (including cannabinoid content) before leaving manufacturing premises for distribution or delivery", reg: "LADCR Reg 5(D)(3); DCC §17401", severity: "high" },
        { id: "e8c", text: "Product labeled in compliance with all applicable State (DCC) labeling requirements — LADCR enforces State labeling standards", reg: "LADCR Reg 5(A)(1)(v) & 5(A)(1)(ix)", severity: "high" },
      ]},
    ]
  },
  mfg_vape: {
    title: "MFG - Vapes/All-in-Ones/Concentrates & Infused Pre-Rolls Labeling Checklist",
    reference: "CCR Title 4 Div. 19, DCC Chapter 11 Art. 3 §§17403–17410",
    sections: [
      { name: "General Requirements", items: [
        { id: "v1a", text: "Required information is in English", reg: "§17402(a)", severity: "high" },
        { id: "v1b", text: "Label is easy to read", reg: "§17402(b)", severity: "high" },
        { id: "v1c", text: "All required information on outermost packaging", reg: "§17402(c)", severity: "high" },
      ]},
      { name: "Primary Panel", items: [
        { id: "v2a", text: "Primary label identifies the product", reg: "§17404(a)(1)", severity: "high" },
        { id: "v2b", text: "Net weight in BOTH metric and US customary units", reg: "§17404(a)(3)", severity: "high" },
        { id: "v2c", text: "Universal symbol at least 0.5\" (or 0.25\" for vape carts/integrated vaporizers)", reg: "§17410", severity: "critical" },
        { id: "v2d", text: "All text at least 6pt font", reg: "§17404(a)", severity: "medium" },
      ]},
      { name: "Informational Panel", items: [
        { id: "v3a", text: "Name of the Licensee", reg: "§17406(a)(1)", severity: "high" },
        { id: "v3b", text: "Packaging Date", reg: "§17406(a)(2)", severity: "high" },
        { id: "v3c", text: "Government Warning in bold caps (full text required)", reg: "§17406(a)(3)", severity: "critical" },
        { id: "v3d", text: "'FOR MEDICAL USE ONLY' if THC exceeds adult-use limits", reg: "§17406(a)(4)", severity: "critical" },
        { id: "v3e", text: "Ingredients list in descending order of predominance", reg: "§17406(a)(5)", severity: "high" },
        { id: "v3f", text: "Allergen statement if applicable", reg: "§17406(a)(6)", severity: "high" },
        { id: "v3g", text: "Artificial colorings named if applicable", reg: "§17406(a)(7)", severity: "medium" },
        { id: "v3h", text: "Instructions for use/consumption", reg: "§17406(a)(9)", severity: "medium" },
        { id: "v3i", text: "Product UID", reg: "§17406(a)(10)", severity: "critical" },
        { id: "v3j", text: "Batch number", reg: "§17406(a)(11)", severity: "critical" },
        { id: "v3k", text: "'KEEP REFRIGERATED' if applicable", reg: "§17406(a)(12)", severity: "medium" },
        { id: "v3l", text: "All text at least 6pt font", reg: "§17406(b)", severity: "medium" },
      ]},
      { name: "Cannabinoid Content", items: [
        { id: "v4a", text: "Cannabinoid content on Primary or Informational Panel", reg: "§17407(a)", severity: "critical" },
        { id: "v4b", text: "THC and CBD expressed in mg per package", reg: "§17407(b)(2)", severity: "critical" },
        { id: "v4b2", text: "Infused pre-rolls: cannabinoid in mg OR flower % + added mg", reg: "§17407(b)(4)", severity: "critical" },
        { id: "v4c", text: "If THC/CBD < 2mg, stated as '<2 mg per package'", reg: "§17407(c)", severity: "high" },
        { id: "v4d", text: "After COA: cannabinoids ≥5% listed with percentages", reg: "§17407(d)(1)", severity: "high" },
        { id: "v4e", text: "After COA: labeled amounts match COA", reg: "§17407(d)(2)", severity: "critical" },
        { id: "v4f", text: "Cannabinoid label on outermost packaging, not obstructing other info", reg: "§17407(d)(3)", severity: "high" },
      ]},
      { name: "Labeling Restrictions", items: [
        { id: "v5a", text: "No misleading CA city/county name", reg: "§17408(a)(1)", severity: "high" },
        { id: "v5b", text: "Not attractive to individuals under 21", reg: "§17408(a)(2)", severity: "critical" },
        { id: "v5c", text: "No untrue/misleading health statements", reg: "§17408(a)(3)", severity: "critical" },
        { id: "v5d", text: "No false or misleading information of any kind", reg: "§17408(a)(5)", severity: "critical" },
        { id: "v5e", text: "No 'organic' / 'organix' claims unless USDA NOP authorized for cannabis", reg: "§17408(a)(5)(A)", severity: "high" },
        { id: "v5f", text: "No 'OCal' or 'OCal certified' claims unless product meets B&P §26062 program requirements", reg: "§17408(a)(5)(B)", severity: "high" },
        { id: "v5g", text: "No appellation of origin claim unless product meets B&P §26063 program requirements", reg: "§17408(a)(6)", severity: "medium" },
      ]},
      { name: "Anticipated Effects (§17409 — If Used)", items: [
        { id: "v6ae", text: "If anticipated effects are stated, they describe physiological effects only (NOT health benefit or therapeutic claims)", reg: "§17409(a)", severity: "critical" },
        { id: "v6bf", text: "If anticipated effects are stated, licensee has substantiation that the information is truthful and not misleading", reg: "§17409(a)", severity: "high" },
        { id: "v6cf", text: "Anticipated effects statement located on informational panel or supplemental labeling", reg: "§17409(a)", severity: "low" },
      ]},
      { name: "Prop 65 Warning", items: [
        { id: "v6a", text: "Prop 65: 'WARNING: Vaping or dabbing this product during pregnancy exposes your child to delta-9-THC...'", reg: "CA Prop 65", severity: "critical" },
        { id: "v6b", text: "Prop 65 warning symbol next to 'WARNING:'", reg: "CA Prop 65", severity: "high" },
        { id: "v6c", text: "Prop 65 symbol at least same height as 'WARNING'", reg: "CA Prop 65", severity: "medium" },
      ]},
      { name: "Internal Requirements", items: [
        { id: "v7a", text: "Total THC as percentage present", reg: "Internal Memo", severity: "high" },
        { id: "v7b", text: "THC in mg per container", reg: "Internal Memo", severity: "high" },
        { id: "v7c", text: "CBD in mg per container (if applicable)", reg: "Internal Memo", severity: "medium" },
        { id: "v7d", text: "Licensee contact info", reg: "Internal Memo", severity: "medium" },
        { id: "v7e", text: "Space for additional cannabinoid >5%", reg: "Internal Best Practice", severity: "low" },
      ]},
      { name: "LADCR Requirements (City of LA)", items: [
        { id: "v8a", text: "No deceptive, false, or misleading statements on any product label or customer-facing document", reg: "LADCR Reg 5(A)(1)(xi)", severity: "critical" },
        { id: "v8b", text: "Product is fully labeled (including cannabinoid content) before leaving manufacturing premises for distribution or delivery", reg: "LADCR Reg 5(D)(3); DCC §17401", severity: "high" },
        { id: "v8c", text: "Product labeled in compliance with all applicable State (DCC) labeling requirements — LADCR enforces State labeling standards", reg: "LADCR Reg 5(A)(1)(v) & 5(A)(1)(ix)", severity: "high" },
      ]},
    ]
  },
  non_mfg: {
    title: "Non-MFG - Flower / Non-Infused Pre-Rolls Labeling Checklist",
    reference: "CCR Title 4 Div. 19, DCC Chapter 11 Art. 3 §§17403–17410",
    sections: [
      { name: "General Requirements", items: [
        { id: "n1a", text: "Required information is in English", reg: "§17402(a)", severity: "high" },
        { id: "n1b", text: "Label is easy to read", reg: "§17402(b)", severity: "high" },
        { id: "n1c", text: "All required information on outermost packaging", reg: "§17402(c)", severity: "high" },
      ]},
      { name: "Primary Panel", items: [
        { id: "n2a", text: "Primary label identifies the product", reg: "§17403(a)(1)", severity: "high" },
        { id: "n2b", text: "Net weight in BOTH metric and US customary units", reg: "§17403(a)(2)", severity: "high" },
        { id: "n2c", text: "Universal symbol at least 0.5\" height", reg: "§17410", severity: "critical" },
        { id: "n2d", text: "Product UID", reg: "§17403(b)(1)", severity: "critical" },
        { id: "n2e", text: "Name of the Licensee (cultivator or packager)", reg: "§17403(b)(2)", severity: "high" },
        { id: "n2f", text: "Licensee's phone number or website", reg: "§17403(b)(2)", severity: "high" },
        { id: "n2g", text: "Packaging Date", reg: "§17403(b)(3)", severity: "high" },
        { id: "n2h", text: "Government Warning in bold caps (PACKAGE version)", reg: "§17403(b)(4)", severity: "critical" },
        { id: "n2i", text: "All text at least 6pt font", reg: "§17403(a)", severity: "medium" },
      ]},
      { name: "Cannabinoid Content", items: [
        { id: "n3a", text: "Total THC expressed as a percentage", reg: "§17407(b)(3)", severity: "critical" },
        { id: "n3b", text: "After COA: cannabinoids ≥5% listed with percentages", reg: "§17407(d)(1)", severity: "high" },
        { id: "n3c", text: "After COA: labeled amounts match COA", reg: "§17407(d)(2)", severity: "critical" },
        { id: "n3d", text: "Cannabinoid label on outermost packaging", reg: "§17407(d)(3)", severity: "high" },
      ]},
      { name: "Labeling Restrictions", items: [
        { id: "n4a", text: "No misleading CA city/county name", reg: "§17408(a)(1)", severity: "high" },
        { id: "n4b", text: "Not attractive to individuals under 21", reg: "§17408(a)(2)", severity: "critical" },
        { id: "n4c", text: "No untrue/misleading health statements", reg: "§17408(a)(3)", severity: "critical" },
        { id: "n4d", text: "No false or misleading information of any kind", reg: "§17408(a)(5)", severity: "critical" },
        { id: "n4e", text: "No 'organic' / 'organix' claims unless USDA NOP authorized for cannabis", reg: "§17408(a)(5)(A)", severity: "high" },
        { id: "n4f", text: "No 'OCal' or 'OCal certified' claims unless product meets B&P §26062 program requirements", reg: "§17408(a)(5)(B)", severity: "high" },
        { id: "n4g", text: "No appellation of origin claim unless product meets B&P §26063 program requirements", reg: "§17408(a)(6)", severity: "medium" },
      ]},
      { name: "Anticipated Effects (§17409 — If Used)", items: [
        { id: "n5ae", text: "If anticipated effects are stated, they describe physiological effects only (NOT health benefit or therapeutic claims)", reg: "§17409(a)", severity: "critical" },
        { id: "n5bf", text: "If anticipated effects are stated, licensee has substantiation that the information is truthful and not misleading", reg: "§17409(a)", severity: "high" },
        { id: "n5cf", text: "Anticipated effects statement located on informational panel or supplemental labeling", reg: "§17409(a)", severity: "low" },
      ]},
      { name: "Prop 65 Warning", items: [
        { id: "n5a", text: "Prop 65: 'WARNING: Smoking cannabis increases your cancer risk and during pregnancy...'", reg: "CA Prop 65", severity: "critical" },
        { id: "n5b", text: "Prop 65 warning symbol next to 'WARNING:'", reg: "CA Prop 65", severity: "high" },
        { id: "n5c", text: "Prop 65 symbol at least same height as 'WARNING'", reg: "CA Prop 65", severity: "medium" },
      ]},
      { name: "Internal Requirements", items: [
        { id: "n6a", text: "Total THC percentage present", reg: "Internal Memo", severity: "high" },
        { id: "n6b", text: "UID present", reg: "Internal Memo", severity: "critical" },
        { id: "n6c", text: "Batch number present", reg: "Internal Memo", severity: "critical" },
        { id: "n6d", text: "Licensee contact info", reg: "Internal Memo", severity: "medium" },
        { id: "n6e", text: "Any cannabinoid above 5% listed", reg: "Internal Memo", severity: "high" },
      ]},
      { name: "LADCR Requirements (City of LA)", items: [
        { id: "n7a", text: "No deceptive, false, or misleading statements on any product label or customer-facing document", reg: "LADCR Reg 5(A)(1)(xi)", severity: "critical" },
        { id: "n7b", text: "Product is fully labeled (including cannabinoid content) before leaving premises for distribution or delivery", reg: "LADCR Reg 5(D)(3); DCC §17401", severity: "high" },
        { id: "n7c", text: "Product labeled in compliance with all applicable State (DCC) labeling requirements — LADCR enforces State labeling standards", reg: "LADCR Reg 5(A)(1)(v) & 5(A)(1)(ix)", severity: "high" },
      ]},
    ]
  }
};

// ── Regulation References ──
const REGULATION_REFS = {
  '§17302': {
    title: 'Packaging Requirements',
    description: 'Cannabis products must be sold in child-resistant, tamper-evident, and resealable (if multi-dose) packaging. Packaging must not be attractive to persons under 21.',
  },
  '§17304': {
    title: 'Adult-Use Cannabinoid Limits',
    description: 'For adult-use edibles: maximum 10mg THC per serving and 100mg THC per package. Products exceeding these limits must be labeled "FOR MEDICAL USE ONLY".',
  },
  '§17402': {
    title: 'General Labeling Requirements',
    description: 'All required label information must be in English, easy to read, unobstructed and conspicuous, and placed on the outermost packaging.',
  },
  '§17403': {
    title: 'Nonmanufactured Cannabis Primary Panel',
    description: 'For flower/non-infused pre-rolls: product identity, net weight (metric + US customary), universal symbol (≥0.5"), UID, cultivator/packager name and contact info, packaging date, and government warning (PACKAGE version) in bold caps.',
  },
  '§17404': {
    title: 'Manufactured Cannabis Primary Panel',
    description: 'For manufactured cannabis products: product identity, universal symbol (≥0.5"), net weight (metric + US customary); all text must be at least 6pt font.',
  },
  '§17405': {
    title: 'Edible Cannabis Products – Primary Panel',
    description: 'Edibles must display "cannabis-infused" or "cannabis infused" in bold immediately above the product identity statement, in a larger text size than the identity.',
  },
  '§17406': {
    title: 'Manufactured Cannabis Informational Panel',
    description: 'Must include: licensee name and contact, packaging date, government warning (PRODUCT version, bold caps), "FOR MEDICAL USE ONLY" if THC exceeds §17304 limits, ingredients in descending order by predominance, allergens, artificial colorings, nutritional info for edibles (sodium/sugar/carbs/total fat per serving), instructions for use, UID, batch/lot number, refrigeration notice if applicable; all text min 6pt font.',
  },
  '§17407': {
    title: 'Cannabinoid Content Labeling',
    description: 'Cannabinoid content must appear on primary or informational panel. Edibles: mg/serving + mg/package. Vapes/concentrates: mg/package. Flower: percentage. Amounts <2mg must be stated as "<2 mg". Any cannabinoid ≥5% of total must be listed. Labeled amounts must match COA within ±10%.',
  },
  '§17408': {
    title: 'Labeling Restrictions',
    description: 'Prohibited: misleading California city/county names, content attractive to individuals under 21, false or misleading health claims, pictures of edible products on exterior packaging, false or misleading information of any kind, "organic"/"organix" claims without USDA NOP authorization for cannabis, "OCal" claims without B&P §26062 compliance, appellation of origin claims without B&P §26063 compliance.',
  },
  '§17409': {
    title: 'Anticipated Effects (Optional)',
    description: 'Anticipated effects statements are OPTIONAL. If used, they must describe physiological effects only (e.g., "may cause drowsiness") and NOT health benefit or therapeutic claims. The licensee must have substantiation that the information is truthful and not misleading. Must appear on informational panel or supplemental labeling, not the primary panel.',
  },
  '§17410': {
    title: 'Universal Symbol Requirements',
    description: 'The California universal cannabis symbol must be black or white on a contrasting background, not altered or cropped, and at least 0.5" in height. Exception: vape cartridges and integrated vaporizers may use a symbol of at least 0.25" in height.',
  },
  '§15307.1': {
    title: 'COA Variance Tolerance',
    description: 'Labeled cannabinoid amounts may vary from Certificate of Analysis (COA) test results by no more than ±10%.',
  },
  'CA Prop 65': {
    title: 'California Proposition 65 Warning',
    description: 'California Prop 65 requires specific health warnings on cannabis products. The warning must include the required text, a triangle warning symbol (⚠), and the symbol must be at least the same height as the word "WARNING". Text varies by product type: edibles reference ingestion, vapes/concentrates reference vaping/dabbing, and flower/pre-rolls reference smoking.',
  },
  'LADCR Reg 5': {
    title: 'LADCR Operating Standards',
    description: 'Los Angeles Department of Cannabis Regulation Operating Standards prohibit deceptive, false, or misleading statements on product labels and customer-facing documents (Reg 5(A)(1)(xi)). Products must be fully labeled (including cannabinoid content) before leaving manufacturing premises for distribution or delivery (Reg 5(D)(3)). LADCR enforces all State DCC labeling requirements (Reg 5(A)(1)(v) & 5(A)(1)(ix)).',
  },
};

const SYSTEM_PROMPT = `You are a cannabis regulatory compliance expert specializing in California Department of Cannabis Control (DCC) regulations and Los Angeles Department of Cannabis Regulation (LADCR) rules.

Your job is to analyze cannabis product packaging and labels for compliance with:
1. DCC Regulations (CCR Title 4 Div. 19, Chapter 11 §§17402-17410) - Labeling & Packaging (revised January 1, 2026)
2. LADCR Rules & Regulations (Effective Oct 17, 2025) — NOTE: LADCR does not contain product-specific labeling requirements; it primarily governs licensing, operations, and security. LADCR enforces State labeling compliance and prohibits deceptive/false/misleading statements on products and customer-facing documents (LADCR Reg 5(A)(1)(xi)). Products must be labeled before leaving premises for delivery/distribution (Reg 5(D)(3)).
3. California Prop 65 warnings specific to cannabis products
4. Internal standards and the Labeled Cannabinoid Memo

KEY REGULATORY REQUIREMENTS (DCC Jan 1, 2026 revision):
- §17402: All label text in English, unobstructed/conspicuous, required info on outermost packaging
- §17403: Nonmanufactured primary panel: product identity, net weight (metric + US), universal symbol (≥0.5"); informational label: UID, cultivator name+contact, pkg date, govt warning (PACKAGE version in bold)
- §17404: Manufactured primary panel: product identity, universal symbol (≥0.5"), net weight (metric + US); all text min 6pt font
- §17405: Edibles primary panel additionally: "cannabis-infused" or "cannabis infused" in BOLD immediately ABOVE identity, in LARGER text size than identity
- §17406: Manufactured informational panel: licensee name+contact, pkg date, govt warning (PRODUCT version in bold), FOR MEDICAL USE ONLY if THC exceeds §17304 limits, ingredients in descending order, allergens, artificial colorings, edible nutritional info (sodium/sugar/carbs/total fat per serving), instructions for use, UID, batch/lot#, refrigeration notice if applicable; all text min 6pt
- §17407: Cannabinoid content on primary or informational panel; edibles: mg/serving + mg/pkg; vapes/concentrates: mg/pkg; flower: percentage; <2mg → "<2 mg"; any cannabinoid ≥5% of total must be listed; must match COA within ±10%
- §17408: Labeling restrictions — no misleading city/county name, not attractive to under 21, no false health claims, no edible product pictures, no false/misleading info; NO "organic"/"organix" claims unless USDA NOP authorized; NO "OCal" claims unless meets B&P §26062; NO appellation of origin unless meets B&P §26063
- §17409: Anticipated effects are OPTIONAL — if used, must be physiological effects only (NOT health benefit/therapeutic claims), must be truthful and substantiated, must be on informational panel or supplemental labeling
- §17410: Universal symbol — black or white on contrasting background; ≥0.5" height EXCEPT vape cartridges/integrated vaporizers which may be ≥0.25"; not altered or cropped
- Adult-use edibles: max 10mg THC/serving, 100mg THC/package (§17304)
- COA variance tolerance: ±10% between label and test results (§15307.1)
- Government warning: EXACT text required — "PRODUCT" version for manufactured, "PACKAGE" version for nonmanufactured

When analyzing a label image or description, evaluate EVERY checklist item. For each:
- Determine PASS, FAIL, or UNABLE TO VERIFY
- Cite the specific regulation using its EXACT section code (e.g. §17408(a)(1), §17407(b)(1), CA Prop 65, LADCR Reg 5(A)(1)(xi))
- Explain why it fails and how to fix it
- Assess risk level
- For §17409 Anticipated Effects items: if no anticipated effects statement is present on the label, mark as PASS (it's optional). Only flag if a statement IS present and violates the rule.

Output your analysis as JSON with this structure:
{
  "summary": "2-3 sentence executive summary of overall compliance status and key findings",
  "items": [
    {
      "id": "checklist item id",
      "status": "pass" | "fail" | "warning" | "unverifiable",
      "finding": "What was found",
      "recommendation": "How to fix (if fail/warning)",
      "regulation": "Exact regulation citation code (e.g. §17408(a)(1), §17407(b)(1), CA Prop 65, LADCR Reg 5(A)(1)(xi))"
    }
  ],
  "complianceScore": numeric integer 0-100 (the UI converts this to a letter grade),
  "riskScore": 0-100,
  "criticalIssues": ["Each entry MUST begin with the exact citation code followed by a colon, e.g.: '§17408(a)(2): Content appears attractive to minors — remove cartoon imagery'"],
  "recommendations": ["Prioritized fixes, each referencing the specific regulation code, e.g.: '§17406(a)(3): Add the required government warning statement in bold caps'"]
}

IMPORTANT: The "regulation" field for every item MUST contain the exact DCC section number (e.g. §17408(a)(1)), Prop 65 citation, or LADCR reference. Every criticalIssues entry MUST start with the citation code followed by a colon and description. Every recommendations entry MUST reference the specific regulation.

WARNING CONSOLIDATION: When the label type is 'Packaging / Strain Label only', do NOT generate individual warnings for every compliance label field. Instead, generate ONE single warning item with this exact finding: 'Compliance label required — ensure it includes: Product Identifier, Ingredients, Batch #, UID #, Package Date, Total THC%, THC mg/pkg, CBD mg/pkg, and Licensee Name + contact info' and regulation '[§17406, §17407]'. Only generate additional individual warnings for things actually visible and questionable on the packaging itself (e.g. youth-appealing design, misleading claims). Keep total warnings to 5 or fewer.`;

const QA_SYSTEM_PROMPT = `You are a California cannabis compliance expert with deep knowledge of DCC regulations (CCR Title 4, Division 19), LADCR rules, and Prop 65.

Answer questions concisely and directly. Format every answer like this:
- Start with a 2-3 sentence direct answer
- Follow with a 'Key Requirements' section if applicable (bullet points, max 5 bullets)
- End with a 'Relevant Regulations' section listing specific citations in this format: [§17404] [§17406] etc.

Rules:
- Only answer questions related to California cannabis compliance, labeling, packaging, and regulations
- If asked something outside this scope, politely redirect
- Always cite the specific regulation section when stating a requirement
- Be concise — no long paragraphs
- If unsure, say so and recommend consulting a compliance attorney`;

function buildSystemPrompt(labelType) {
  const labelTypeSection = `

LABEL TYPE CONTEXT:
The user has indicated this image is: ${labelType}.
Adjust your analysis accordingly:

- If 'Packaging / Strain Label': Evaluate ONLY primary panel requirements (§17404) — product identity, universal symbol, net weight, government warning, Prop 65. Do NOT flag missing compliance label fields (batch number, UID, ingredients, cannabinoid content, etc.) as failures — these belong on the compliance label which was not uploaded. Note in your summary that a separate compliance label is required.

- If 'Compliance Label': Evaluate ONLY the variable data fields: Product Identifier, Ingredients (with 'Ingredients:' header), Batch #, UID #, Package Date, Total THC%, THC mg/pkg, CBD mg/pkg, Licensee Name + phone or website. Do NOT flag missing packaging artwork elements as failures.

- If 'Both': Evaluate all requirements for both primary panel and compliance label. This is a full compliance review.`;
  return SYSTEM_PROMPT + labelTypeSection;
}

// ── Letter Grade Helper ──
function scoreToGrade(score) {
  if (score >= 97) return { grade: "A+", color: "#22c55e" };
  if (score >= 93) return { grade: "A",  color: "#22c55e" };
  if (score >= 90) return { grade: "A-", color: "#22c55e" };
  if (score >= 87) return { grade: "B+", color: "#84cc16" };
  if (score >= 83) return { grade: "B",  color: "#eab308" };
  if (score >= 80) return { grade: "B-", color: "#eab308" };
  if (score >= 77) return { grade: "C+", color: "#f97316" };
  if (score >= 73) return { grade: "C",  color: "#f97316" };
  if (score >= 70) return { grade: "C-", color: "#f97316" };
  if (score >= 67) return { grade: "D+", color: "#ef4444" };
  if (score >= 63) return { grade: "D",  color: "#ef4444" };
  if (score >= 60) return { grade: "D-", color: "#ef4444" };
  return { grade: "F", color: "#ef4444" };
}

// ── Severity Badge ──
function SeverityBadge({ severity }) {
  const colors = {
    critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#94a3b8"
  };
  return (
    <span style={{ fontSize: 9, fontWeight: 600, color: colors[severity] || "#94a3b8",
      textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Mono', monospace" }}>
      {severity}
    </span>
  );
}

// ── Regulation Reference Helpers ──
function extractBaseSection(citation) {
  if (!citation) return null;
  if (citation.includes('Prop 65')) return 'CA Prop 65';
  if (citation.includes('LADCR')) return 'LADCR Reg 5';
  const match = citation.match(/§(\d+)/);
  return match ? `§${match[1]}` : null;
}

function RegulationModal({ citation, onClose }) {
  const base = extractBaseSection(citation);
  const ref = base ? REGULATION_REFS[base] : null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a2740', border: '1px solid #334155', borderRadius: 12,
        padding: 28, maxWidth: 460, width: '100%', position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 14, background: 'transparent',
          border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22, lineHeight: 1,
        }}>×</button>
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#22c55e', textTransform: 'uppercase',
          letterSpacing: 1, marginBottom: 6, fontFamily: "'DM Mono', monospace",
        }}>{citation}</div>
        {ref ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>
              {ref.title}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: '#cbd5e1', marginBottom: 20 }}>
              {ref.description}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, lineHeight: 1.6 }}>
            This citation refers to an internal standard or a regulation section not in the quick-reference library.
          </div>
        )}
        <a
          href="https://cannabis.ca.gov/cannabis-laws/dcc-regulations/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 7,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600,
          }}
        >
          View Full Regulation ↗
        </a>
      </div>
    </div>
  );
}

function CitationLink({ citation, onOpen }) {
  if (!citation) return null;
  return (
    <button
      onClick={() => onOpen(citation)}
      style={{
        background: 'transparent', border: '1px solid #334155', borderRadius: 4,
        color: '#22c55e', fontSize: 10, fontFamily: "'DM Mono', monospace",
        cursor: 'pointer', padding: '1px 6px', marginLeft: 6, fontWeight: 600,
        verticalAlign: 'middle',
      }}
    >
      {citation}
    </button>
  );
}

// ── QA Response Renderer ──
function renderQaResponse(text, onOpen) {
  if (!text) return null;
  const citationRegex = /\[(§[^\]]+)\]/g;

  // Collect unique citations for the "Referenced Regulations" row
  const citations = [];
  const seen = new Set();
  let m;
  while ((m = citationRegex.exec(text)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); citations.push(m[1]); }
  }

  // Build inline text with citation chips replaced by spans (keep readable)
  const parts = [];
  let lastIndex = 0;
  citationRegex.lastIndex = 0;
  let key = 0;
  while ((m = citationRegex.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(<span key={key++}>{text.slice(lastIndex, m.index)}</span>);
    parts.push(
      <CitationLink key={key++} citation={m[1]} onOpen={onOpen} />
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);

  return { parts, citations };
}

// ── Main App ──
export default function ComplianceChecker() {
  const [selectedType, setSelectedType] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState("");
  const [qaMode, setQaMode] = useState(false);
  const [qaResponse, setQaResponse] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);
  const fileRef = useRef(null);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [regModal, setRegModal] = useState(null);
  const [reportId] = useState(() => {
    const d = new Date();
    const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `CP-${ds}-${String(Math.floor(Math.random() * 900) + 100)}`;
  });
  const [showPassed, setShowPassed] = useState(false);
  const [isPackagingLabel, setIsPackagingLabel] = useState(false);
  const [isComplianceLabel, setIsComplianceLabel] = useState(false);
  const labelType = isPackagingLabel && isComplianceLabel
    ? 'Packaging / Strain Label AND Compliance Label (full review)'
    : isPackagingLabel
    ? 'Packaging / Strain Label only'
    : isComplianceLabel
    ? 'Compliance Label only'
    : '';

  const PASSWORD = 'finalbell2024';

  const handleUnlock = () => {
    if (passwordInput === PASSWORD) {
      setUnlocked(true);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  useEffect(() => {
    fetch('https://cannapliant.up.railway.app/health')
      .catch(() => {});
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setResults(null);
    setError(null);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview({ type: "image", data: ev.target.result });
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      setFilePreview({ type: "pdf", name: file.name });
    } else {
      setFilePreview({ type: "file", name: file.name });
    }
  }, []);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1920;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  };

  const runAnalysis = async () => {
    if (!selectedType || !(isPackagingLabel || isComplianceLabel) || !uploadedFile) return;
    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const checklist = CHECKLISTS[selectedType];
      const allItems = checklist.sections.flatMap(s => s.items);
      const checklistText = checklist.sections.map(s =>
        `### ${s.name}\n${s.items.map(i => `- [${i.id}] ${i.text} (${i.reg}) [Severity: ${i.severity}]`).join("\n")}`
      ).join("\n\n");

      let contentParts = [];

      if (uploadedFile.type.startsWith("image/") || uploadedFile.type === "application/pdf") {
        let fileToEncode = uploadedFile;
        let mediaType = uploadedFile.type === "application/pdf" ? "application/pdf" : "image/jpeg";

        if (uploadedFile.type.startsWith("image/")) {
          fileToEncode = await compressImage(uploadedFile);
        } else if (uploadedFile.size > 3145728) {
          setError("For best results, use PDFs under 3MB or upload an image instead");
        }

        const base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = () => rej(new Error("Failed to read file"));
          r.readAsDataURL(fileToEncode);
        });

        if (uploadedFile.type === "application/pdf") {
          contentParts.push({
            type: "document",
            source: { type: "base64", media_type: mediaType, data: base64 }
          });
        } else {
          contentParts.push({
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 }
          });
        }
      }

      contentParts.push({
        type: "text",
        text: `Analyze this cannabis product label for compliance. Product type: ${checklist.title}.

CHECKLIST TO EVALUATE:
${checklistText}

Evaluate every item on the checklist against this label. Return ONLY valid JSON matching the schema described in the system prompt. No markdown, no backticks, just raw JSON.`
      });

      const response = await fetch('https://cannapliant.up.railway.app/api/messages', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: buildSystemPrompt(labelType),
          messages: [{ role: "user", content: contentParts }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();

      try {
        const parsed = JSON.parse(clean);
        setResults({ ...parsed, checklist: allItems });
      } catch {
        setResults({
          summary: text,
          items: [],
          complianceScore: null,
          riskScore: null,
          criticalIssues: [],
          recommendations: [],
          rawResponse: text,
          checklist: allItems,
        });
      }
    } catch (err) {
      setError("Analysis failed: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    setQaLoading(true);
    setQaResponse(null);
    try {
      const response = await fetch('https://cannapliant.up.railway.app/api/messages', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: QA_SYSTEM_PROMPT,
          messages: [{ role: "user", content: question }],
        }),
      });
      const data = await response.json();
      const text = data.content?.map(b => b.text || "").join("") || "No response received.";
      setQaResponse(text);
    } catch (err) {
      setQaResponse("Error: " + err.message);
    } finally {
      setQaLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!results) return;
    const { grade } = scoreToGrade(results.complianceScore ?? 0);
    const selectedProduct = CHECKLISTS[selectedType]?.title;
    const gradeColor = (grade === 'A+' || grade === 'A' || grade === 'A-') ? '2ecc71' :
                       (grade.startsWith('B') || grade.startsWith('C')) ? 'f39c12' : 'e74c3c';
    const failItems = results.items?.filter(i => i.status === 'fail') || [];
    const rawWarnItems = results.items?.filter(i => i.status === 'warning' || i.status === 'unverifiable') || [];
    const seenFindings = new Set();
    const warnItems = rawWarnItems.filter(item => {
      const key = item.finding || item.id;
      if (seenFindings.has(key)) return false;
      seenFindings.add(key);
      return true;
    });

    const doc = new Document({
      styles: {
        default: { document: { run: { font: 'Arial', size: 24 } } },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal',
            run: { size: 32, bold: true, font: 'Arial', color: '1a2740' },
            paragraph: { spacing: { before: 240, after: 120 } } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal',
            run: { size: 26, bold: true, font: 'Arial', color: '2c3e50' },
            paragraph: { spacing: { before: 200, after: 100 } } },
        ]
      },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          // Title
          new Paragraph({
            children: [new TextRun({ text: 'Cannapliant Compliance Report', bold: true, size: 40, font: 'Arial', color: '1a2740' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),

          // Report meta
          new Paragraph({
            children: [new TextRun({ text: `Report ID: ${reportId}`, size: 20, color: '888888' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString()}`, size: 20, color: '888888' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Product Type: ${selectedProduct}`, size: 20, color: '888888' })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: `Label Type: ${labelType}`, size: 20, color: '888888' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'dddddd', space: 1 } }
          }),

          // Grade
          new Paragraph({
            children: [new TextRun({ text: `Overall Grade: ${grade}`, bold: true, size: 52, font: 'Arial', color: gradeColor })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 300 }
          }),

          // Executive Summary
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Executive Summary')] }),
          new Paragraph({ children: [new TextRun({ text: results.summary || '', size: 24 })], spacing: { after: 300 } }),

          // Critical Issues
          ...(failItems.length > 0 ? [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Critical Issues', color: 'c0392b' })] }),
            ...failItems.map(item => {
              const checkItem = results.checklist?.find(c => c.id === item.id);
              const text = item.finding || checkItem?.text || 'Compliance failure';
              const citation = item.regulation ? ` [${item.regulation}]` : '';
              return new Paragraph({
                children: [new TextRun({ text: `• ${text}${citation}`, size: 24, color: '2c3e50' })],
                spacing: { after: 100 },
                indent: { left: 360 }
              });
            })
          ] : []),

          // Warnings
          ...(warnItems.length > 0 ? [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Warnings', color: 'e67e22' })] }),
            ...warnItems.map(item => {
              const checkItem = results.checklist?.find(c => c.id === item.id);
              const text = item.finding || checkItem?.text || 'Warning';
              const citation = item.regulation ? ` [${item.regulation}]` : '';
              return new Paragraph({
                children: [new TextRun({ text: `• ${text}${citation}`, size: 24, color: '2c3e50' })],
                spacing: { after: 100 },
                indent: { left: 360 }
              });
            })
          ] : []),

          // Recommended Actions
          ...(results.recommendations?.length > 0 ? [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Recommended Actions')] }),
            ...results.recommendations.map((rec, i) => new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ${rec}`, size: 24, color: '2c3e50' })],
              spacing: { after: 100 },
              indent: { left: 360 }
            }))
          ] : []),

          // Footer
          new Paragraph({
            children: [new TextRun({ text: 'Generated by Cannapliant', size: 18, color: 'aaaaaa', italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'dddddd', space: 1 } }
          }),
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cannapliant-report-${reportId}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!unlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a1628',
      }}>
        <div style={{
          background: '#1a2740',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
          width: '320px',
        }}>
          <h2 style={{ color: '#fff', marginBottom: '8px' }}>Cannapliant</h2>
          <p style={{ color: '#aaa', marginBottom: '24px', fontSize: '14px' }}>Enter password to continue</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder="Password"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: passwordError ? '1px solid #e74c3c' : '1px solid #333',
              background: '#0a1628',
              color: '#fff',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />
          {passwordError && <p style={{ color: '#e74c3c', fontSize: '13px', marginBottom: '12px' }}>Incorrect password</p>}
          <button
            onClick={handleUnlock}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              background: '#2ecc71',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#e2e8f0",
      fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 24px",
        background: "linear-gradient(180deg, #0f172a 0%, #0a0e17 100%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center",
          justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8,
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚖</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", letterSpacing: -0.5 }}>
                Cannapliant</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setQaMode(false); setResults(null); setUploadedFile(null); setFilePreview(null); setSelectedType(null); setIsPackagingLabel(false); setIsComplianceLabel(false); }}
              style={{ padding: "8px 16px", borderRadius: 6, border: !qaMode ? "1px solid #22c55e" : "1px solid #334155",
                background: !qaMode ? "#052e1620" : "transparent", color: !qaMode ? "#22c55e" : "#94a3b8",
                cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Compliance Check
            </button>
            <button onClick={() => setQaMode(true)}
              style={{ padding: "8px 16px", borderRadius: 6, border: qaMode ? "1px solid #22c55e" : "1px solid #334155",
                background: qaMode ? "#052e1620" : "transparent", color: qaMode ? "#22c55e" : "#94a3b8",
                cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Ask a Question
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 60px" }}>
        {/* Global Regulation Modal (used in both Q&A and results) */}
        {regModal && <RegulationModal citation={regModal} onClose={() => setRegModal(null)} />}

        {/* Q&A Mode */}
        {qaMode && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 8 }}>
              Ask a Compliance Question</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
              Ask anything about DCC regulations, LADCR rules, packaging, labeling, or operational compliance.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input value={question} onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && askQuestion()}
                placeholder="e.g., What are the THC limits for adult-use edibles?"
                style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #334155",
                  background: "#0f172a", color: "#e2e8f0", fontSize: 14, outline: "none",
                  fontFamily: "'DM Sans', sans-serif" }} />
              <button onClick={askQuestion} disabled={qaLoading || !question.trim()}
                style={{ padding: "12px 24px", borderRadius: 8, border: "none",
                  background: qaLoading ? "#1e293b" : "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                {qaLoading ? "Thinking..." : "Ask"}
              </button>
            </div>
            {qaResponse && (() => {
              const rendered = renderQaResponse(qaResponse, setRegModal);
              return (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                  padding: 24 }}>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.8, color: "#cbd5e1",
                    fontFamily: "'DM Sans', sans-serif" }}>
                    {rendered.parts}
                  </div>
                  {rendered.citations.length > 0 && (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #1e293b" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                        letterSpacing: 1, marginBottom: 10 }}>Referenced Regulations</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {rendered.citations.map((c, i) => (
                          <CitationLink key={i} citation={c} onOpen={setRegModal} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Label Review Mode */}
        {!qaMode && !results && (
          <>
            {/* Product Type Selection */}
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 8 }}>
              Select Product Type</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
              Choose the product category to load the correct compliance checklist.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12, marginBottom: 32 }}>
              {PRODUCT_TYPES.map(pt => (
                <button key={pt.id} onClick={() => setSelectedType(pt.id)}
                  style={{ padding: 20, borderRadius: 12, cursor: "pointer", textAlign: "left",
                    border: selectedType === pt.id ? "2px solid #22c55e" : "1px solid #1e293b",
                    background: selectedType === pt.id ? "#052e1615" : "#0f172a",
                    transition: "all 0.15s ease" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{pt.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: selectedType === pt.id ? "#22c55e" : "#e2e8f0",
                    marginBottom: 4 }}>{pt.label}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{pt.desc}</div>
                </button>
              ))}
            </div>

            {/* Label Type + File Upload */}
            {selectedType && (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 8 }}>
                  What are you uploading?</h2>
                <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
                  Select the type of label so the AI knows which requirements to evaluate.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  {[
                    { key: 'packaging', label: 'Packaging / Strain Label', desc: 'Artwork only — no compliance variable data (batch #, UID, cannabinoids, ingredients, etc.)', checked: isPackagingLabel, set: setIsPackagingLabel },
                    { key: 'compliance', label: 'Compliance Label', desc: 'Variable data sticker or panel only (batch #, UID, cannabinoids, ingredients, licensee info, etc.)', checked: isComplianceLabel, set: setIsComplianceLabel },
                  ].map(opt => (
                    <label key={opt.key} style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "14px 20px", borderRadius: 10, cursor: "pointer",
                      border: opt.checked ? "2px solid #22c55e" : "1px solid #1e293b",
                      background: opt.checked ? "#052e1615" : "#0f172a",
                      transition: "all 0.15s ease",
                    }}>
                      <input type="checkbox" checked={opt.checked}
                        onChange={e => { opt.set(e.target.checked); setUploadedFile(null); setFilePreview(null); setError(null); }}
                        style={{ marginTop: 2, accentColor: "#22c55e", width: 16, height: 16, flexShrink: 0, cursor: "pointer" }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3,
                          color: opt.checked ? "#22c55e" : "#e2e8f0" }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {(isPackagingLabel || isComplianceLabel) && (<>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 8 }}>
                  Upload Label for Review</h2>
                <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
                  Upload a PDF or image of your label. The AI will evaluate it as a{" "}
                  <strong style={{ color: "#22c55e" }}>{labelType}</strong> using the{" "}
                  {CHECKLISTS[selectedType].title} checklist.</p>

                {analyzing ? (
                  /* ── IN/OUT bin loader ── */
                  <div style={{ border: "2px dashed #334155", borderRadius: 12, padding: 40,
                    textAlign: "center", background: "#0f172a", minHeight: 200,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 28 }}>
                    <div style={{ position: "relative", width: 220, height: 80 }}>
                      {/* IN bin */}
                      <div style={{ position: "absolute", left: 0, bottom: 0, width: 72, height: 56,
                        border: "2px solid #334155", borderTop: "none", borderRadius: "0 0 6px 6px",
                        background: "#0a1628", display: "flex", alignItems: "flex-end",
                        justifyContent: "center", paddingBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b",
                          letterSpacing: 2, fontFamily: "'DM Mono', monospace" }}>IN</span>
                      </div>
                      {/* IN bin top rim */}
                      <div style={{ position: "absolute", left: -4, bottom: 52, width: 80, height: 6,
                        background: "#334155", borderRadius: 3 }} />

                      {/* OUT bin */}
                      <div style={{ position: "absolute", right: 0, bottom: 0, width: 72, height: 56,
                        border: "2px solid #22c55e40", borderTop: "none", borderRadius: "0 0 6px 6px",
                        background: "#0a1628", display: "flex", alignItems: "flex-end",
                        justifyContent: "center", paddingBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e80",
                          letterSpacing: 2, fontFamily: "'DM Mono', monospace" }}>OUT</span>
                      </div>
                      {/* OUT bin top rim */}
                      <div style={{ position: "absolute", right: -4, bottom: 52, width: 80, height: 6,
                        background: "#22c55e40", borderRadius: 3 }} />

                      {/* Sliding paper */}
                      <div style={{ position: "absolute", left: 14, bottom: 58,
                        animation: "paperSlide 2s ease-in-out infinite" }}>
                        <div style={{ width: 44, height: 34, background: "#1e293b",
                          border: "1px solid #475569", borderRadius: 3, position: "relative",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                          {/* paper lines */}
                          <div style={{ position: "absolute", top: 7, left: 6, right: 6, height: 2,
                            background: "#334155", borderRadius: 1 }} />
                          <div style={{ position: "absolute", top: 13, left: 6, right: 10, height: 2,
                            background: "#334155", borderRadius: 1 }} />
                          <div style={{ position: "absolute", top: 19, left: 6, right: 8, height: 2,
                            background: "#22c55e30", borderRadius: 1 }} />
                          {/* folded corner */}
                          <div style={{ position: "absolute", top: 0, right: 0, width: 0, height: 0,
                            borderLeft: "7px solid #0a1628", borderBottom: "7px solid transparent" }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8",
                        letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
                        Analyzing label...
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", fontFamily: "'DM Mono', monospace" }}>
                        This may take 15–30 seconds
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                  <div onClick={() => fileRef.current?.click()}
                    style={{ border: "2px dashed #334155", borderRadius: 12, padding: 40,
                      textAlign: "center", cursor: "pointer", background: "#0f172a",
                      transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#22c55e"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#334155"}>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload}
                      style={{ display: "none" }} />
                    {filePreview ? (
                      <div>
                        {filePreview.type === "image" && (
                          <img src={filePreview.data} alt="Label preview"
                            style={{ maxHeight: 200, borderRadius: 8, marginBottom: 12 }} />
                        )}
                        {filePreview.type === "pdf" && (
                          <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
                        )}
                        <div style={{ color: "#22c55e", fontWeight: 600, fontSize: 14 }}>
                          {uploadedFile?.name}</div>
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                          Click to change file</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 48, marginBottom: 8, opacity: 0.5 }}>📤</div>
                        <div style={{ color: "#94a3b8", fontSize: 14 }}>
                          Drop a file or click to upload</div>
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                          PDF or image files accepted</div>
                      </div>
                    )}
                  </div>

                  {uploadedFile && (
                    <div style={{ marginTop: 20, textAlign: "center" }}>
                      <button onClick={runAnalysis}
                        style={{ padding: "14px 40px", borderRadius: 10, border: "none",
                          background: "linear-gradient(135deg, #22c55e, #16a34a)",
                          color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer",
                          letterSpacing: 0.3, boxShadow: "0 4px 24px #22c55e30" }}>
                        Run Compliance Check
                      </button>
                    </div>
                  )}
                  </>
                )}

                {error && (
                  <div style={{ marginTop: 16, padding: 16, background: "#350a0a", border: "1px solid #7f1d1d",
                    borderRadius: 8, color: "#f87171", fontSize: 14 }}>{error}</div>
                )}


                </>)}
              </>
            )}
          </>
        )}

        {/* Results */}
        {results && (
          <div>
              {/* Action Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <button
                onClick={() => { setResults(null); setUploadedFile(null); setFilePreview(null); setShowPassed(false); setIsPackagingLabel(false); setIsComplianceLabel(false); }}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #334155",
                  background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}
              >
                ← New Analysis
              </button>
              <button
                onClick={downloadReport}
                style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #22c55e",
                  background: "transparent", color: "#22c55e", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                ↓ Download Report
              </button>
            </div>

            {/* Uploaded Label Preview */}
            {filePreview && (
              <div style={{ marginBottom: 24, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                  letterSpacing: 1, marginBottom: 8 }}>Uploaded Label</div>
                <div style={{ display: "inline-block", border: "1px solid #2a3a5c", borderRadius: 8,
                  overflow: "hidden", maxWidth: 300 }}>
                  {filePreview.type === "image" ? (
                    <img src={filePreview.data} alt="Uploaded label"
                      style={{ display: "block", width: "100%", maxWidth: 300 }} />
                  ) : (
                    <div style={{ padding: 20, display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 8, background: "#0f172a" }}>
                      <span style={{ fontSize: 36 }}>📄</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", wordBreak: "break-all" }}>
                        {filePreview.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Report Header */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
              padding: "16px 20px", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
                Compliance Report
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px 24px" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Report ID</div>
                  <div style={{ fontSize: 13, color: "#22c55e", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{reportId}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Date</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1" }}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Product Type</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1" }}>{CHECKLISTS[selectedType]?.title}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Label Type</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1" }}>{labelType}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>File</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", wordBreak: "break-all" }}>{uploadedFile?.name}</div>
                </div>
              </div>
            </div>

            {/* Overall Grade */}
            {results.complianceScore != null && (() => {
              const { grade, color } = scoreToGrade(results.complianceScore);
              return (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16,
                  padding: 32, textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                    letterSpacing: 1, marginBottom: 16 }}>Overall Compliance Grade</div>
                  <div style={{ fontSize: 96, fontWeight: 700, color, lineHeight: 1,
                    fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>{grade}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Score: {results.complianceScore} / 100</div>
                </div>
              );
            })()}

            {/* Executive Summary */}
            {results.summary && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                  letterSpacing: 1, marginBottom: 8 }}>Executive Summary</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: "#cbd5e1" }}>{results.summary}</div>
              </div>
            )}

            {/* Critical Issues */}
            {(() => {
              const failItems = results.items?.filter(i => i.status === 'fail') || [];
              if (failItems.length === 0) return null;
              return (
                <div style={{ background: "#350a0a", border: "1px solid #7f1d1d", borderRadius: 12,
                  padding: 20, marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f87171", textTransform: "uppercase",
                    letterSpacing: 1, marginBottom: 14 }}>⚠ Critical Issues ({failItems.length})</div>
                  {failItems.map((item, i) => {
                    const checkItem = results.checklist?.find(c => c.id === item.id);
                    return (
                      <div key={item.id || i} style={{ padding: "10px 0",
                        borderBottom: i < failItems.length - 1 ? "1px solid #7f1d1d40" : "none" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                          <span style={{ color: "#ef4444", fontWeight: 700, flexShrink: 0, fontSize: 14 }}>✕</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, color: "#fca5a5", lineHeight: 1.5 }}>
                              {item.finding || checkItem?.text || 'Compliance failure'}
                            </span>
                            {item.regulation && (
                              <CitationLink citation={item.regulation} onOpen={setRegModal} />
                            )}
                          </div>
                        </div>
                        {item.recommendation && (
                          <div style={{ marginLeft: 22, fontSize: 12, color: "#f87171", lineHeight: 1.5 }}>
                            Fix: {item.recommendation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Warnings */}
            {(() => {
              const rawWarnItems = results.items?.filter(i => i.status === 'warning' || i.status === 'unverifiable') || [];
              const seen = new Set();
              const warnItems = rawWarnItems.filter(item => {
                const key = item.finding || item.id;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              if (warnItems.length === 0) return null;
              return (
                <div style={{ background: "#2a2000", border: "1px solid #c49a2a", borderRadius: 12,
                  padding: 20, marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#c49a2a", textTransform: "uppercase",
                    letterSpacing: 1, marginBottom: 14 }}>⚡ Warnings ({warnItems.length})</div>
                  {warnItems.map((item, i) => {
                    const checkItem = results.checklist?.find(c => c.id === item.id);
                    return (
                      <div key={item.id || i} style={{ padding: "10px 0",
                        borderBottom: i < warnItems.length - 1 ? "1px solid #c49a2a40" : "none" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                          <span style={{ color: "#c49a2a", fontWeight: 700, flexShrink: 0, fontSize: 15 }}>!</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 15, color: "#e8c97a", lineHeight: 1.5 }}>
                              {item.finding || checkItem?.text || (item.status === 'unverifiable' ? 'Unable to verify' : 'Needs attention')}
                            </span>
                            {item.regulation && (
                              <CitationLink citation={item.regulation} onOpen={setRegModal} />
                            )}
                          </div>
                        </div>
                        {item.recommendation && (
                          <div style={{ marginLeft: 22, fontSize: 13, color: "#c49a2a", lineHeight: 1.5 }}>
                            Note: {item.recommendation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Passed Items (collapsible) */}
            {(() => {
              const passItems = results.items?.filter(i => i.status === 'pass') || [];
              if (passItems.length === 0) return null;
              return (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                  marginBottom: 24, overflow: "hidden" }}>
                  <button
                    onClick={() => setShowPassed(s => !s)}
                    style={{ width: "100%", padding: "14px 20px", background: "transparent", border: "none",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      cursor: "pointer" }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase",
                      letterSpacing: 1, color: "#22c55e" }}>
                      ✓ Passed Items ({passItems.length})
                    </span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {showPassed ? "▲ Collapse" : "▼ Expand"}
                    </span>
                  </button>
                  {showPassed && (
                    <div style={{ padding: "0 20px 16px" }}>
                      {passItems.map((item, i) => {
                        const checkItem = results.checklist?.find(c => c.id === item.id);
                        return (
                          <div key={item.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 8,
                            padding: "8px 0",
                            borderBottom: i < passItems.length - 1 ? "1px solid #1e293b" : "none" }}>
                            <span style={{ color: "#22c55e", fontWeight: 700, flexShrink: 0, fontSize: 14 }}>✓</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                                {checkItem?.text || item.finding || 'Passed'}
                              </span>
                              {item.regulation && (
                                <CitationLink citation={item.regulation} onOpen={setRegModal} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Recommended Actions */}
            {results.recommendations?.length > 0 && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#22c55e", textTransform: "uppercase",
                  letterSpacing: 1, marginBottom: 10 }}>Recommended Actions</div>
                {results.recommendations.map((rec, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#cbd5e1", padding: "6px 0",
                    lineHeight: 1.5, borderBottom: i < results.recommendations.length - 1 ? "1px solid #1e293b" : "none" }}>
                    <span style={{ color: "#22c55e", fontWeight: 700, marginRight: 8,
                      fontFamily: "'DM Mono', monospace" }}>{i + 1}.</span>{rec}
                  </div>
                ))}
              </div>
            )}

            {/* Raw response fallback */}
            {results.rawResponse && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                padding: 20, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#cbd5e1",
                marginTop: 24 }}>
                {results.rawResponse}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes paperSlide {
          0%   { transform: translateX(0px);   opacity: 1; }
          45%  { transform: translateX(130px);  opacity: 1; }
          55%  { transform: translateX(130px);  opacity: 0; }
          56%  { transform: translateX(0px);    opacity: 0; }
          70%  { transform: translateX(0px);    opacity: 1; }
          100% { transform: translateX(0px);    opacity: 1; }
        }
        * { box-sizing: border-box; margin: 0; }
        ::selection { background: #22c55e40; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0e17; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
      `}</style>
    </div>
  );
}
