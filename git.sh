#!/bin/bash

# Configure Git para case-sensitive no seu sistema
git config core.ignorecase false

# Remove todos os enums do cache
git rm --cached src/infra/graphql/enum/* 2>/dev/null || true

# Garanta que estão em minúsculo
for file in src/infra/graphql/enum/*; do
  if [[ "$file" != *.enum.ts ]]; then
    newname="${file%.ts}.ts"
    newname="${newname%.Enum.ts}.enum.ts"
    newname="${newname%.ENUM.ts}.enum.ts"
    if [[ "$file" != "$newname" ]]; then
      mv "$file" "$newname"
    fi
  fi
done

# Re-adicione
git add src/infra/graphql/enum/

# Commit
git commit -m "fix: correct TypeScript enum files case sensitivity for Linux"

# Push
git push --force-with-lease
