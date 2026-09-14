"""System prompt and prompt assembly for the orchestrator's narration step.

The LLM receives three things: the deterministic finding a rule-based agent
already produced, the exact source figures that finding cites, and only the
evidence RAG actually retrieved. It is instructed not to recompute, not to
invent sources, and to say so plainly when the evidence doesn't explain the
finding.

Nothing the model returns is written back into the finding's figures — it
fills one free-text field and nothing else.
"""

from __future__ import annotations

from app.agents.contracts import AgentFinding
from app.rag.retrieval import RetrievedEvidence

SYSTEM_PROMPT = """\
You are a financial statement review copilot assisting a human reviewer.

Non-negotiable rules:
- The deterministic finding and source figures provided to you are
  authoritative. Never recompute, restate, round differently, or
  contradict them.
- Only use the evidence snippets given to you. Never invent a company
  filing, document name, page number, quotation, or data point that is
  not present in the evidence provided.
- If the evidence does not clearly explain the finding, say so plainly
  instead of guessing or speculating about causes.
- Clearly distinguish the deterministic finding from your interpretation
  of the evidence — do not blend them into one unsupported claim.
- Refer to figures the way the finding states them. Do not characterize a
  number vaguely ("revenue is high") when the exact figure is available.
- Be concise (2-4 sentences) and professional, like a financial analyst
  writing a review note, not a conversational chatbot.
- Always note that this is a finding for human review, not a final
  conclusion.
"""

_AGENT_DESCRIPTIONS = {
    "mathematical_correctness": (
        "a rule that recomputed a reported figure from its own definitional formula"
    ),
    "internal_consistency": (
        "a rule that compared separately reported figures for mutual coherence"
    ),
    "variance": "a rule that measured year-over-year movement against a materiality threshold",
}


def build_user_prompt(
    finding: AgentFinding,
    evidence: list[RetrievedEvidence],
    instruction: str | None = None,
) -> str:
    lines = [
        "DETERMINISTIC FINDING (authoritative, do not recompute):",
        f"- Company: {finding.company}",
        f"- Fiscal year: {finding.year}",
        f"- Severity: {finding.severity.value}",
        f"- Produced by: {finding.agent.value} agent, rule {finding.check_code}",
        f"  ({_AGENT_DESCRIPTIONS.get(finding.agent.value, 'a deterministic rule')})",
        f"- Finding: {finding.statement}",
        "",
        "SOURCE FIGURES CITED (verbatim from the uploaded file):",
    ]
    for i, citation in enumerate(finding.citations, start=1):
        lines.append(f"[{i}] {citation.render()}")

    lines += ["", "RETRIEVED EVIDENCE (use only this; do not add outside knowledge):"]
    if evidence:
        for i, e in enumerate(evidence, start=1):
            lines.append(f"[{i}] (similarity={e.similarity:.2f}) {e.text}")
    else:
        lines.append("(none retrieved)")

    if instruction:
        lines += ["", f"REVIEWER INSTRUCTION: {instruction}"]

    lines += [
        "",
        "Write a short (2-4 sentence) grounded interpretation of this finding "
        "using only the evidence above. If the evidence does not explain it, "
        "say the evidence does not clearly explain it rather than guessing.",
    ]
    return "\n".join(lines)
