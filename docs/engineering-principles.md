# Engineering principles: how we build

Status: Accepted 2026-11-21 (Maciej)
Last updated: 2026-11-21

These are Maciej's engineering principles for work on the Bobiverse companion.
They are about how we build. The product constitution is
[design-principles.md](design-principles.md); this document does not override
it.

The wording below is a paraphrase of the `principle-*` skills in
[pstack/skills](https://github.com/cursor/plugins/tree/main/pstack/skills).

## Principles

1. **Build the lever.** For non-trivial work, write the smallest rerunnable
   script, codemod or check that does the job or proves it. Do not do it by
   hand, and do not start a framework. Do the first unit by hand, prove the
   tool on that unit, and commit the tool.
2. **Encode lessons in structure.** When a mistake repeats, add a check or a
   tool that prevents it. Do not just write another instruction.
3. **Attack the premise.** After two failed fixes that share the same premise,
   write that premise down and test it before trying another fix.
4. **Boundary discipline.** Validate at system boundaries. Trust the types
   inside. Keep logic in pure functions behind a thin shell.
5. **Laziness.** Keep one source of truth for each decision, and make the
   smallest diff that solves the problem.
6. **Test behaviour, not implementation.** A test must fail when the behaviour
   breaks, and it must survive a refactor that does not change behaviour.
7. **Subtract before you add.** Remove first. Do not add speculative code,
   validators or features.
8. **Redesign from first principles.** When a new requirement arrives,
   integrate it as if it had always been there, and propagate it everywhere it
   belongs. Do not bolt it on.
9. **Outcome-oriented execution.** Planned, scoped intermediate breakage is
   fine. Verify fully at the end, rather than preserving every intermediate
   state with throwaway compatibility code.
10. **Model the domain.** Use data structures and state machines, not scattered
    conditionals.
11. **Minimise reader load.** Remove pass-through layers. Keep mutable state
    small.
