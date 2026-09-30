.PHONY: infra dev verify stop clean reset logs build test lint typecheck migrate seed studio generate-secrets
infra:
	bash scripts/start-services.sh
dev: infra
	pnpm --parallel --filter @devpulse/api --filter @devpulse/socket --filter @devpulse/ai --filter @devpulse/web dev
verify:
	bash scripts/verify-services.sh
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
seed:
	pnpm seed
studio:
	pnpm studio
generate-secrets:
	@echo "Copy these to your .env:"
	@echo ""
	@printf "SESSION_SECRET=" && openssl rand -hex 32
	@printf "JWT_PRIVATE_KEY_PATH=./keys/private.pem\n"
	@printf "JWT_PUBLIC_KEY_PATH=./keys/public.pem\n"
