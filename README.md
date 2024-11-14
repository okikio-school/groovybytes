Pulsar Communication System

```sh
curl -fsSL https://get.jetify.com/devbox | bash
devbox shell
```

### Steps to Deploy:

1. **Create the `bkvm.conf` file**: Ensure you have a `bkvm.conf` file in your current working directory with the appropriate Pulsar Manager configuration.

2. **Run Docker Compose**: Use the following command to start the services:
   ```sh
   docker-compose up -d ./systems/events/docker-compose.yml
   ```

3. **Initialize Superuser**: After the containers are running, initialize the superuser using the following commands:
   ```sh
   CSRF_TOKEN=$(curl http://localhost:7750/pulsar-manager/csrf-token)
   curl -H "X-XSRF-TOKEN: $CSRF_TOKEN" \\
        -H "Cookie: XSRF-TOKEN=$CSRF_TOKEN;" \\
        -H "Content-Type: application/json" \\
        -X PUT http://localhost:7750/pulsar-manager/users/superuser \\
        -d '{"name": "admin", "password": "apachepulsar", "description": "test", "email": "username@test.org"}'
   ```

You can then access the Pulsar Manager web UI at `http://localhost:9527` using the default credentials:  
- **Username**: `admin`  
- **Password**: `apachepulsar`

This configuration ensures all required ports are mapped and the containers are linked for intercommunication.