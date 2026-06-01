SHELL := /bin/bash

.PHONY: help install build test lint doc-check doc-guard agent-docs release-check

help:
	@echo "Available commands:"
	@echo "  make help          Show this help"
	@echo "  make install       Install Node dependencies"
	@echo "  make build         Run npm build when configured"
	@echo "  make test          Run npm test"
	@echo "  make lint          Run npm lint when configured"
	@echo "  make doc-check     Run local documentation checks"
	@echo "  make doc-guard     Run Doc Watch Guard report"
	@echo "  make agent-docs    Print a safe agent documentation review prompt"
	@echo "  make release-check Run docs, lint, test, and build checks"

install:
	@if [[ -f package-lock.json ]]; then npm ci; else npm install; fi

build:
	@set -euo pipefail; \
	if npm run | grep -qE '^  build$$'; then \
		npm run build; \
	else \
		echo "No npm build script configured; skipping build."; \
	fi

test:
	@npm test

lint:
	@set -euo pipefail; \
	if npm run | grep -qE '^  lint$$'; then \
		npm run lint; \
	else \
		echo "No npm lint script configured; using build as validation fallback."; \
		if npm run | grep -qE '^  build$$'; then npm run build; else echo "No npm build fallback configured; skipping lint."; fi; \
	fi

doc-check:
	@./scripts/doc-check-local.sh

doc-guard:
	@./scripts/doc-guard.sh

agent-docs:
	@./scripts/agent-doc-review.sh

release-check: doc-check doc-guard lint test build
