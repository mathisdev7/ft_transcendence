.PHONY: help build run stop clean logs dev prod

COMPOSE_FILE = docker-compose.yml
COMPOSE_DEV_FILE = docker-compose.dev.yml

GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m

help:
	@echo "$(GREEN)Commandes disponibles:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

build:
	@echo "$(GREEN)Construction des images Docker...$(NC)"
	docker compose -f $(COMPOSE_FILE) build --no-cache

build-dev:
	@echo "$(GREEN)Construction des images Docker (dev)...$(NC)"
	docker compose -f $(COMPOSE_DEV_FILE) build --no-cache

run:
	@echo "$(GREEN)Démarrage des services en production...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d

dev:
	@echo "$(GREEN)Démarrage des services en mode développement...$(NC)"
	docker compose -f $(COMPOSE_DEV_FILE) up -d

run-frontend:
	@echo "$(GREEN)Démarrage du frontend...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d frontend

run-backend:
	@echo "$(GREEN)Démarrage des services backend...$(NC)"
	docker compose -f $(COMPOSE_FILE) up -d auth-backend game-backend

stop:
	@echo "$(YELLOW)Arrêt des services...$(NC)"
	docker compose -f $(COMPOSE_FILE) down
	docker compose -f $(COMPOSE_DEV_FILE) down

restart: stop run

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

logs-frontend:
	docker compose -f $(COMPOSE_FILE) logs -f frontend

logs-auth:
	docker compose -f $(COMPOSE_FILE) logs -f auth-backend

logs-game:
	docker compose -f $(COMPOSE_FILE) logs -f game-backend

clean:
	@echo "$(RED)Nettoyage des resources Docker...$(NC)"
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker compose -f $(COMPOSE_DEV_FILE) down -v --remove-orphans
	docker system prune -f

clean-all:
	@echo "$(RED)Nettoyage complet...$(NC)"
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans --rmi all
	docker compose -f $(COMPOSE_DEV_FILE) down -v --remove-orphans --rmi all
	docker system prune -a -f --volumes

status:
	@echo "$(GREEN)Statut des services:$(NC)"
	docker compose -f $(COMPOSE_FILE) ps

shell-frontend:
	docker compose -f $(COMPOSE_FILE) exec frontend sh

shell-auth:
	docker compose -f $(COMPOSE_FILE) exec auth-backend sh

shell-game:
	docker compose -f $(COMPOSE_FILE) exec game-backend sh

up: run
down: stop
ps: status
