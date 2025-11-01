# Tiny helper Makefile for local dev convenience
.PHONY: start stop build checks status pm2-start pm2-stop pm2-logs

start:
	@# Prefer PM2-based dev start when available, otherwise fall back to start_local_dev
	@if command -v npx >/dev/null 2>&1 && npx pm2 -v >/dev/null 2>&1; then \
		echo "Starting via PM2 (pm2 ecosystem)..."; \
		npm run dev:background >/dev/null 2>&1 || true; \
		npx pm2 list || true; \
	else \
		echo "PM2 not found, falling back to scripts/start_local_dev.sh"; \
		./scripts/start_local_dev.sh; \
	fi

stop:
	@if command -v npx >/dev/null 2>&1 && npx pm2 -v >/dev/null 2>&1; then \
		echo "Stopping PM2-managed apps..."; \
		npm run dev:stop >/dev/null 2>&1 || true; \
		npx pm2 delete ecosystem.config.js >/dev/null 2>&1 || true; \
	else \
		echo "PM2 not available, falling back to scripts/stop_local_dev.sh"; \
		./scripts/stop_local_dev.sh; \
	fi

build:
	@VITE_API_BASE=http://localhost:8080 npm run --prefix frontend build

checks:
	@bash review_report.sh || true

status:
	@echo "PIDs:"
	@if [ -f tmp/backend.pid ]; then echo "backend: $(cat tmp/backend.pid)"; fi
	@if [ -f tmp/frontend.pid ]; then echo "frontend: $(cat tmp/frontend.pid)"; fi
	@echo "Logs: tmp/backend.log tmp/frontend.log tmp/frontend-build.log"
