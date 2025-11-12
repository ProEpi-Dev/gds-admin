#!/bin/sh
set -e

# Usa host.docker.internal no Windows/Mac ou hostname do container
POSTGRES_HOST=${POSTGRES_HOST:-host.docker.internal}

flyway -url=jdbc:postgresql://${POSTGRES_HOST}:5432/${POSTGRES_DB} \
       -user=${POSTGRES_USER} \
       -password=${POSTGRES_PASSWORD} \
       -connectRetries=60 \
       repair

flyway -url=jdbc:postgresql://${POSTGRES_HOST}:5432/${POSTGRES_DB} \
       -user=${POSTGRES_USER} \
       -password=${POSTGRES_PASSWORD} \
       -connectRetries=60 \
       migrate

