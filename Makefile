.PHONY: lint test build typecheck

lint:
	npx @biomejs/biome ci .

test:
	npm test

build:
	npm run build

typecheck:
	npm run typecheck
