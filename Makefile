NAME = mukanda

COMPOSE_FILE = ./docker-compose.yml

DATA_PATH = /home/${USER}/data/mukanda_saas

GREEN  = \033[0;32m
YELLOW = \033[0;33m
RED    = \033[0;31m
NC     = \033[0m

all: setup up

setup:
	@echo "$(YELLOW)Criando diretórios de dados...$(NC)"
	@mkdir -p $(DATA_PATH)/nginx/certs
	@mkdir -p $(DATA_PATH)/postgres
	@mkdir -p $(DATA_PATH)/redis
	@mkdir -p $(DATA_PATH)/n8n
	@mkdir -p $(DATA_PATH)/sites
	@mkdir -p $(DATA_PATH)/evogo
	@mkdir -p $(DATA_PATH)/rabbitmq/rabbitmq_lib
	@mkdir -p $(DATA_PATH)/rabbitmq/rabbitmq_log
	@echo "$(GREEN)Diretórios criados com sucesso!$(NC)"
up:
	@echo "$(YELLOW)Iniciando containers...$(NC)"
	@docker compose -f $(COMPOSE_FILE) up -d --build
	@echo "$(GREEN)Containers iniciados com sucesso!$(NC)"

down:
	@echo "$(YELLOW)Parando containers...$(NC)"
	@docker compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)Containers parados!$(NC)"

restart: down up

clean: down
	@echo "$(YELLOW)Removendo containers, networks e volumes...$(NC)"
	@docker compose -f $(COMPOSE_FILE) down -v --rmi all
	@echo "$(GREEN)Limpeza concluída!$(NC)"

fclean: clean
	@echo "$(RED)Removendo todos os dados persistentes...$(NC)"
	@sudo rm -rf $(DATA_PATH)/postgres
	@sudo rm -rf $(DATA_PATH)/redis
	@sudo rm -rf $(DATA_PATH)/n8n
	@sudo rm -rf $(DATA_PATH)/sites
	@sudo rm -rf $(DATA_PATH)/evogo
	@echo "$(GREEN)Dados removidos!$(NC)"

re: fclean all