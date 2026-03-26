---
"@aliou/pi-guardrails": minor
---

Bloquer les tentatives de bypass des hooks pre-commit

Ajoute un détecteur structurel (`checkPreCommitBypass`) qui déclenche
la permission gate sur :

- `git commit --no-verify` / `git commit -n`
- `git push --no-verify`
- Variables d'env désactivant les hooks avant git commit/push :
  `HUSKY=0`, `HUSKY_SKIP_HOOKS`, `SKIP=`, `PRE_COMMIT_ALLOW_NO_CONFIG`,
  `GIT_HOOKS_DISABLED`

La détection se fait par analyse AST (comme les autres matchers built-in),
ce qui évite les faux positifs sur des chaînes mentionnant `--no-verify`
dans des messages de commit ou des commentaires.
