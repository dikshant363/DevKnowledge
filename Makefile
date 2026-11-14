.PHONY: all setup test lint build clean docker-up docker-down rust-build rust-test py-test web-build

all: setup test build

setup:
	uv venv --python 3.12 .venv || true
	uv pip install -e ".[dev]" || true
	pnpm install || true

test: py-test rust-test web-test

py-test:
	uv run pytest tests/ apps/api/tests/ apps/worker/tests/ -v

rust-test:
	cargo test --workspace

rust-build:
	cargo build --workspace

web-build:
	pnpm --filter @devknowledge/web build

web-test:
	pnpm --filter @devknowledge/web test || true

lint:
	uv run ruff check .
	cargo clippy --workspace -- -D warnings || true
	pnpm run lint || true

format:
	uv run ruff format .
	cargo fmt --all

docker-up:
	docker compose up -d

docker-down:
	docker compose down

clean:
	rm -rf target .pytest_cache .ruff_cache htmlcov .next dist build
