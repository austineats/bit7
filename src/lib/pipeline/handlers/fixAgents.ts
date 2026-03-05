/**
 * Specialized Fix Agents — targeted, regex-based code repairs.
 * These run without LLM calls for fast, deterministic fixes.
 *
 * IMPORTANT: These agents must be CONSERVATIVE. It is better to
 * leave a minor issue unfixed than to corrupt working JSX code.
 * Only apply fixes that are provably safe — no complex regex
 * transforms on JSX attributes or expressions.
 */

/* ------------------------------------------------------------------ */
/*  Syntax Fixer Agent                                                  */
/* ------------------------------------------------------------------ */

export function fixSyntaxIssues(code: string): { code: string; fixes: string[] } {
  const fixes: string[] = [];
  let fixed = code;

  // Fix missing render call
  if (fixed.length > 200 && !fixed.includes('createRoot') && !fixed.includes('ReactDOM.render')) {
    fixed += '\nReactDOM.createRoot(document.getElementById("root")).render(<App />);';
    fixes.push("Added missing render call");
  }

  // Fix bare SDK calls — these are common LLM mistakes that cause crashes
  // Only fix calls that are NOT already prefixed with __sb. or window.__sb.
  const useStoreFixed = fixed.replace(/(?<!\w)(?<!__sb\.)(?<!window\.__sb\.)useStore\s*\(/g, 'window.__sb.useStore(');
  if (useStoreFixed !== fixed) {
    fixed = useStoreFixed;
    fixes.push("Fixed bare useStore() → window.__sb.useStore()");
  }

  const toastFixed = fixed.replace(/(?<!\w)(?<!__sb\.)(?<!window\.__sb\.)toast\s*\(/g, 'window.__sb.toast(');
  if (toastFixed !== fixed) {
    fixed = toastFixed;
    fixes.push("Fixed bare toast() → window.__sb.toast()");
  }

  return { code: fixed, fixes };
}

/* ------------------------------------------------------------------ */
/*  Run All Fix Agents                                                  */
/* ------------------------------------------------------------------ */

export function runAllFixAgents(code: string): { code: string; allFixes: string[] } {
  const allFixes: string[] = [];

  // Only run the syntax fixer — it handles provably safe transformations.
  // Performance fixes (console.log removal) and accessibility fixes
  // (aria-label injection) are too fragile for regex-based transforms
  // and are better handled by the LLM repair pass.
  const syntax = fixSyntaxIssues(code);
  allFixes.push(...syntax.fixes.map(f => `[Syntax] ${f}`));

  return { code: syntax.code, allFixes };
}
