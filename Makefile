APP_NAME=gestao-api
IMAGE_NAME=joaoof/$(APP_NAME)
STACK_NAME=gestao-stack
COMPOSE_FILE=docker-compose.yml

.PHONY: build deploy update logs clean

build:
	docker build -t $(IMAGE_NAME):latest .

deploy:
	docker stack deploy -c $(COMPOSE_FILE) $(STACK_NAME)

update: build deploy

logs:
	docker service logs -f $(STACK_NAME)_api

clean:
	docker stack rm $(STACK_NAME)
