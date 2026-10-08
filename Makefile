.PHONY: infra dev verify verify-win stop clean reset logs build test lint typecheck migrate db-status db-migrate db-reset seed studio e2e-setup e2e e2e-headed e2e-ui e2e-report generate-secrets restore verify-install
infra:
	bash scripts/start-services.sh
dev:
	bash scripts/dev-start.sh
verify:
	bash scripts/verify-services.sh
verify-win:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-services.ps1
stop:
	docker compose down
	@echo "Containers stopped; named volumes were preserved."
clean:
	docker compose down -v
	@echo "Containers and named volumes removed."
reset:
	docker compose down -v
	$(MAKE) infra
logs:
	docker compose logs -f $(SERVICE)
build:
	pnpm build
test:
	pnpm test
lint:
	pnpm lint
typecheck:
	pnpm typecheck
migrate:
	pnpm migrate
db-status:
	pnpm --filter @devpulse/database exec prisma migrate status
db-migrate:
	pnpm --filter @devpulse/database exec prisma migrate deploy
db-reset:
	pnpm --filter @devpulse/database exec prisma migrate reset --force
	pnpm seed
seed:
	pnpm seed
studio:
	pnpm studio
e2e-setup:
	bash scripts/verify-e2e-ready.sh
e2e:
	pnpm --filter @devpulse/web test:e2e:editor
e2e-headed:
	pnpm --filter @devpulse/web test:e2e:headed
e2e-ui:
	pnpm --filter @devpulse/web test:e2e:ui
e2e-report:
	pnpm --dir apps/web exec playwright show-report
generate-secrets:
	@echo "Copy these to your .env:"
	@echo ""
	@printf "SESSION_SECRET=" && openssl rand -hex 32
	@printf "JWT_PRIVATE_KEY_PATH=./keys/private.pem\n"
	@printf "JWT_PUBLIC_KEY_PATH=./keys/public.pem\n"
restore:
	bash scripts/restore-dependencies.sh
verify-install:
	pnpm --filter @devpulse/api typecheck
	pnpm --filter @devpulse/web typecheck
	pnpm --filter @devpulse/ai typecheck
	pnpm --filter @devpulse/database exec prisma validate
	bash -c 'NODE_ENV=test SESSION_SECRET=devpulse-test-only-session-secret-0123456789 pnpm --filter @devpulse/api test'
	pnpm --filter @devpulse/api lint
	pnpm --filter @devpulse/web test
	pnpm --filter @devpulse/web exec playwright test --list
