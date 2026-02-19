import { useState, useRef, useCallback, useEffect } from "react";

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
- Cite the specific regulation
- Explain why it fails and how to fix it
- Assess risk level
- For §17409 Anticipated Effects items: if no anticipated effects statement is present on the label, mark as PASS (it's optional). Only flag if a statement IS present and violates the rule.

Output your analysis as JSON with this structure:
{
  "summary": "Brief overall assessment",
  "items": [
    {
      "id": "checklist item id",
      "status": "pass" | "fail" | "warning" | "unverifiable",
      "finding": "What was found",
      "recommendation": "How to fix (if fail/warning)",
      "regulation": "Specific regulation cite"
    }
  ],
  "complianceScore": 0-100,
  "riskScore": 0-100,
  "criticalIssues": ["list of critical failures"],
  "recommendations": ["prioritized list of fixes"]
}`;

// ── Gauge Component ──
function ScoreGauge({ score, label, color }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const getColor = () => {
    if (color) return color;
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke={getColor()} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }} />
        <text x="70" y="65" textAnchor="middle" fill="#f8fafc" fontSize="32" fontWeight="700"
          fontFamily="'DM Mono', monospace">{score}</text>
        <text x="70" y="85" textAnchor="middle" fill="#94a3b8" fontSize="11"
          fontFamily="'DM Sans', sans-serif">/ 100</text>
      </svg>
      <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1,
        textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
    </div>
  );
}

// ── Status Badge ──
function StatusBadge({ status }) {
  const styles = {
    pass: { bg: "#052e16", color: "#4ade80", border: "#166534", label: "PASS" },
    fail: { bg: "#350a0a", color: "#f87171", border: "#7f1d1d", label: "FAIL" },
    warning: { bg: "#352a04", color: "#fbbf24", border: "#713f12", label: "WARNING" },
    unverifiable: { bg: "#1e1b4b", color: "#a5b4fc", border: "#3730a3", label: "UNVERIFIABLE" },
  };
  const s = styles[status] || styles.unverifiable;
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 4, fontSize: 10,
      fontWeight: 700, letterSpacing: 1.2, background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: "'DM Mono', monospace" }}>{s.label}</span>
  );
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
    if (!selectedType || !uploadedFile) return;
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
          system: SYSTEM_PROMPT,
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
          system: SYSTEM_PROMPT,
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

  const passCount = results?.items?.filter(i => i.status === "pass").length || 0;
  const failCount = results?.items?.filter(i => i.status === "fail").length || 0;
  const warnCount = results?.items?.filter(i => i.status === "warning").length || 0;

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
              <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 0.5 }}>
                DCC (Jan 2026) · LADCR (Oct 2025) · Prop 65</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setQaMode(false); setResults(null); setUploadedFile(null); setFilePreview(null); setSelectedType(null); }}
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
            {qaResponse && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                padding: 24, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, color: "#cbd5e1" }}>
                {qaResponse}
              </div>
            )}
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

            {/* File Upload */}
            {selectedType && (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 8 }}>
                  Upload Label for Review</h2>
                <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
                  Upload a PDF or image of your product packaging/label. The AI will run the full{" "}
                  {CHECKLISTS[selectedType].title} against it.</p>

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
                    <button onClick={runAnalysis} disabled={analyzing}
                      style={{ padding: "14px 40px", borderRadius: 10, border: "none",
                        background: analyzing ? "#1e293b" : "linear-gradient(135deg, #22c55e, #16a34a)",
                        color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer",
                        letterSpacing: 0.3, boxShadow: analyzing ? "none" : "0 4px 24px #22c55e30" }}>
                      {analyzing ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #fff",
                            borderTopColor: "transparent", borderRadius: "50%",
                            animation: "spin 0.8s linear infinite" }} />
                          Analyzing Label...
                        </span>
                      ) : "Run Compliance Check"}
                    </button>
                  </div>
                )}

                {error && (
                  <div style={{ marginTop: 16, padding: 16, background: "#350a0a", border: "1px solid #7f1d1d",
                    borderRadius: 8, color: "#f87171", fontSize: 14 }}>{error}</div>
                )}

                {/* Preview of checklist */}
                <div style={{ marginTop: 32 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>
                    Checklist Preview: {CHECKLISTS[selectedType].title}</h3>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 16 }}>
                    Ref: {CHECKLISTS[selectedType].reference}</div>
                  {CHECKLISTS[selectedType].sections.map(s => (
                    <div key={s.name} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6,
                        textTransform: "uppercase", letterSpacing: 1 }}>{s.name}</div>
                      {s.items.map(item => (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 0", borderBottom: "1px solid #1e293b15", fontSize: 13, color: "#94a3b8" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#334155",
                            flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{item.text}</span>
                          <SeverityBadge severity={item.severity} />
                          <span style={{ fontSize: 10, color: "#475569", fontFamily: "'DM Mono', monospace" }}>
                            {item.reg}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Results */}
        {results && (
          <div>
            <button onClick={() => { setResults(null); setUploadedFile(null); setFilePreview(null); }}
              style={{ marginBottom: 20, padding: "8px 16px", borderRadius: 6, border: "1px solid #334155",
                background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
              ← New Analysis
            </button>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>
              Compliance Report</h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
              {uploadedFile?.name} · {CHECKLISTS[selectedType]?.title}</p>

            {/* Score Cards */}
            {results.complianceScore !== null && (
              <div style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap",
                justifyContent: "center" }}>
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16,
                  padding: 24, flex: "1 1 200px", maxWidth: 240, textAlign: "center" }}>
                  <ScoreGauge score={results.complianceScore} label="Compliance" />
                </div>
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16,
                  padding: 24, flex: "1 1 200px", maxWidth: 240, textAlign: "center" }}>
                  <ScoreGauge score={results.riskScore} label="Risk"
                    color={results.riskScore <= 20 ? "#22c55e" : results.riskScore <= 50 ? "#eab308" : "#ef4444"} />
                </div>
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16,
                  padding: 24, flex: "1 1 200px", maxWidth: 240, display: "flex", flexDirection: "column",
                  justifyContent: "center", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: "#4ade80",
                        fontFamily: "'DM Mono', monospace" }}>{passCount}</div>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase",
                        letterSpacing: 1 }}>Pass</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: "#f87171",
                        fontFamily: "'DM Mono', monospace" }}>{failCount}</div>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase",
                        letterSpacing: 1 }}>Fail</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: "#fbbf24",
                        fontFamily: "'DM Mono', monospace" }}>{warnCount}</div>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase",
                        letterSpacing: 1 }}>Warn</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase",
                    letterSpacing: 1 }}>Item Summary</div>
                </div>
              </div>
            )}

            {/* Summary */}
            {results.summary && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                  letterSpacing: 1, marginBottom: 8 }}>Summary</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: "#cbd5e1" }}>{results.summary}</div>
              </div>
            )}

            {/* Critical Issues */}
            {results.criticalIssues?.length > 0 && (
              <div style={{ background: "#350a0a", border: "1px solid #7f1d1d", borderRadius: 12,
                padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#f87171", textTransform: "uppercase",
                  letterSpacing: 1, marginBottom: 10 }}>⚠ Critical Issues</div>
                {results.criticalIssues.map((issue, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#fca5a5", padding: "4px 0",
                    lineHeight: 1.5 }}>• {issue}</div>
                ))}
              </div>
            )}

            {/* Detailed Findings */}
            {results.items?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                  letterSpacing: 1, marginBottom: 12 }}>Detailed Findings</div>
                {results.items.map((item, i) => (
                  <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b",
                    borderRadius: 8, padding: 16, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <StatusBadge status={item.status} />
                      <span style={{ fontSize: 10, color: "#475569",
                        fontFamily: "'DM Mono', monospace" }}>{item.id}</span>
                      <span style={{ fontSize: 10, color: "#475569",
                        fontFamily: "'DM Mono', monospace" }}>{item.regulation}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#e2e8f0", marginBottom: 4 }}>{item.finding}</div>
                    {item.recommendation && item.status !== "pass" && (
                      <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginTop: 4 }}>
                        💡 {item.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                padding: 20 }}>
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
            {results.rawResponse && !results.items?.length && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
                padding: 20, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#cbd5e1" }}>
                {results.rawResponse}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; }
        ::selection { background: #22c55e40; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0e17; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
      `}</style>
    </div>
  );
}
