# Contributing to DevKnowledge

## Development Setup

### Prerequisites
- Node.js >= 20, pnpm >= 9
- Python >= 3.11, `uv` package manager
- Rust >= 1.78, `cargo`
- Docker and Docker Compose

### Commands
- Setup environment: `make setup`
- Run Python tests: `make py-test`
- Run Rust tests: `make rust-test`
- Lint all projects: `make lint`
- Build all projects: `make build`

## Code Style
- Python: `ruff` formatting and linting.
- Rust: `rustfmt` and `clippy`.
- TypeScript: ESLint & Prettier.
