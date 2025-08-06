# Go WebSocket Chat Demo Makefile

# Variables
BINARY_NAME=go-websocket-chat-demo
DOCKER_IMAGE=websocket-chat
GO_VERSION=1.19
REDIS_VERSION=7-alpine

# Default target
.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development
.PHONY: dev
dev: ## Start development environment with Docker Compose
	docker-compose up --build

.PHONY: dev-logs
dev-logs: ## Show development logs
	docker-compose logs -f

.PHONY: dev-down
dev-down: ## Stop development environment
	docker-compose down

# Build
.PHONY: build
build: ## Build the Go binary
	CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o $(BINARY_NAME) .

.PHONY: build-local
build-local: ## Build the Go binary for local OS
	go build -o $(BINARY_NAME) .

.PHONY: clean
clean: ## Clean build artifacts
	rm -f $(BINARY_NAME)
	docker-compose down --volumes --remove-orphans
	docker system prune -f

# Testing
.PHONY: test
test: ## Run Go tests
	go test -v ./...

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

.PHONY: test-race
test-race: ## Run tests with race detection
	go test -race -v ./...

.PHONY: test-frontend
test-frontend: ## Instructions for running frontend tests
	@echo "Frontend tests run in the browser:"
	@echo "1. Start the application: make dev"
	@echo "2. Open http://localhost:8080/test-runner.html"
	@echo "3. Click 'Run All Tests'"

# Code Quality
.PHONY: lint
lint: ## Run linter
	golangci-lint run

.PHONY: format
format: ## Format Go code
	gofmt -w .
	goimports -w .

.PHONY: vet
vet: ## Run go vet
	go vet ./...

.PHONY: mod-tidy
mod-tidy: ## Tidy Go modules
	go mod tidy
	go mod vendor

# Docker
.PHONY: docker-build
docker-build: ## Build Docker image
	docker build -t $(DOCKER_IMAGE):latest .

.PHONY: docker-run
docker-run: ## Run Docker container
	docker run -d --name websocket-chat-container \
		-p 8080:8080 \
		-e REDIS_URL=redis://host.docker.internal:6379 \
		$(DOCKER_IMAGE):latest

.PHONY: docker-stop
docker-stop: ## Stop Docker container
	docker stop websocket-chat-container || true
	docker rm websocket-chat-container || true

.PHONY: docker-push
docker-push: docker-build ## Push Docker image to registry
	docker tag $(DOCKER_IMAGE):latest your-registry/$(DOCKER_IMAGE):latest
	docker push your-registry/$(DOCKER_IMAGE):latest

# Database
.PHONY: redis-start
redis-start: ## Start Redis server
	docker run -d --name redis-server -p 6379:6379 redis:$(REDIS_VERSION)

.PHONY: redis-stop
redis-stop: ## Stop Redis server
	docker stop redis-server || true
	docker rm redis-server || true

.PHONY: redis-cli
redis-cli: ## Connect to Redis CLI
	docker exec -it redis-server redis-cli

# Deployment
.PHONY: deploy-heroku
deploy-heroku: ## Deploy to Heroku
	git push heroku main

.PHONY: deploy-check
deploy-check: ## Check deployment readiness
	@echo "Checking deployment readiness..."
	@echo "✓ Checking Go version..."
	@go version
	@echo "✓ Checking Docker..."
	@docker --version
	@echo "✓ Running tests..."
	@make test
	@echo "✓ Building binary..."
	@make build
	@echo "✅ Ready for deployment!"

# Development Tools
.PHONY: install-tools
install-tools: ## Install development tools
	go install golang.org/x/tools/cmd/goimports@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/cosmtrek/air@latest

.PHONY: air
air: ## Run with hot reload using air
	air

# Performance
.PHONY: benchmark
benchmark: ## Run benchmarks
	go test -bench=. -benchmem ./...

.PHONY: profile
profile: ## Run with profiling
	go build -o $(BINARY_NAME) .
	./$(BINARY_NAME) &
	@echo "Profiling available at http://localhost:8080/debug/pprof/"
	@echo "Press Ctrl+C to stop"

# Security
.PHONY: security-check
security-check: ## Run security checks
	@echo "Running security checks..."
	@command -v gosec >/dev/null 2>&1 || { echo "Installing gosec..."; go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest; }
	gosec ./...

# Documentation
.PHONY: docs
docs: ## Generate documentation
	@echo "Documentation files:"
	@echo "  - README.md: Project overview and quick start"
	@echo "  - DEVELOPMENT.md: Development guide"
	@echo "  - DEPLOYMENT.md: Deployment instructions"
	@echo "  - API documentation: http://localhost:8080/debug/pprof/ (when running)"

# All-in-one commands
.PHONY: setup
setup: install-tools mod-tidy ## Setup development environment
	@echo "✅ Development environment setup complete!"

.PHONY: ci
ci: format lint test test-race ## Run CI pipeline locally
	@echo "✅ CI pipeline completed successfully!"

.PHONY: full-test
full-test: test test-race test-coverage ## Run all tests
	@echo "✅ All tests completed!"
	@echo "📊 Coverage report: coverage.html"

# Quick commands
.PHONY: up
up: dev ## Alias for dev

.PHONY: down
down: dev-down ## Alias for dev-down

.PHONY: logs
logs: dev-logs ## Alias for dev-logs

.PHONY: restart
restart: down up ## Restart development environment