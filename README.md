Pulsar Communication System

```sh
docker pull apachepulsar/pulsar:latest
docker run -d -it \
    -p 6650:6650 \
    -p 8080:8080 \
    -v pulsardata:/pulsar/data \
    -v pulsarconf:/pulsar/conf \
    --name pulsar-standalone \
    apachepulsar/pulsar:latest \
    bin/pulsar standalone
```

```sh
docker pull apachepulsar/pulsar-manager:latest
docker run -it \
    -p 9527:9527 -p 7750:7750 \
    -e SPRING_CONFIGURATION_FILE=/pulsar-manager/pulsar-manager/application.properties \
    -v $PWD/bkvm.conf:/pulsar-manager/pulsar-manager/bkvm.conf \
    --link pulsar-standalone \
    apachepulsar/pulsar-manager:latest
```

The current default account is user: `admin`, password: `apachepulsar`

```sh

CSRF_TOKEN=$(curl http://localhost:7750/pulsar-manager/csrf-token)
curl \
   -H 'X-XSRF-TOKEN: $CSRF_TOKEN' \
   -H 'Cookie: XSRF-TOKEN=$CSRF_TOKEN;' \
   -H "Content-Type: application/json" \
   -X PUT http://localhost:7750/pulsar-manager/users/superuser \
   -d '{"name": "admin", "password": "apachepulsar", "description": "test", "email": "username@test.org"}'
```