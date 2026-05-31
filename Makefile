SHELL := /bin/bash

.PHONY: help install build test lint doc-check doc-guard watch-docs agent-docs release-check

help:
	@echo "Available commands:"
	@echo "  make help          Show this help"
	@echo "  make install       Install Node dependencies with npm ci"
	@echo "  make build         Compile TypeScript"
	@echo "  make test          Run Node/Vitest tests"
	@echo "  make lint          Run lint if configured; otherwise run build validation"
	@echo "  make doc-check     Run local documentation checks"
	@echo "  make doc-guard     Run Doc Watch Guard report"
	@echo "  make watch-docs    Re-run doc checks in a loop"
	@echo "  make agent-docs    Print a safe agent documentation review prompt"
	@echo "  make release-check Run docs, lint, tests, and build"

install:
	@npm ci

build:
	@npm run build

test:
	@npm test

lint:
	@set -euo pipefail; \
	if npm run | grep -qE '^  lint$$'; then \
		npm run lint; \
	else \
		echo "package.json has no lint script; using npm run build as validation."; \
		npm run build; \
	fi

doc-check:
	@./scripts/doc-check-local.sh

doc-guard:
	@./scripts/doc-guard.sh

watch-docs:
	@./scripts/watch-docs.sh

agent-docs:
	@./scripts/agent-doc-review.sh

release-check: doc-check doc-guard lint test build
