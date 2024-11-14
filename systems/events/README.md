# Event System

### Steps to Deploy:

1. **Create the `bkvm.conf` file**: Ensure you have a `bkvm.conf` file in your current working directory with the appropriate Pulsar Manager configuration.

2. **Run Docker Compose**: Use the following command to start the services:
   ```sh
   docker-compose up -d
   ```

3. **Initialize Superuser**: After the containers are running, initialize the superuser using the following commands:
   ```sh
   CSRF_TOKEN=$(curl http://localhost:7750/pulsar-manager/csrf-token)
   curl -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
        -H "Cookie: XSRF-TOKEN=$CSRF_TOKEN;" \
        -H "Content-Type: application/json" \
        -X PUT http://localhost:7750/pulsar-manager/users/superuser \
        -d '{"name": "admin", "password": "apachepulsar", "description": "test", "email": "username@test.org"}'
   ```

You can then access the Pulsar Manager web UI at `http://localhost:9527` using the default credentials:  
- **Username**: `admin`  
- **Password**: `apachepulsar`

This configuration ensures all required ports are mapped and the containers are linked for intercommunication.


After running these steps, the Pulsar Manager is running locally at http://127.0.0.1:9527/#/environments.

## Access Pulsar Manager

1. Access Pulsar manager UI at `http://${frontend-end-ip}/#/environments`.

    If you started Pulsar Manager using docker or docker-compose, the Pulsar Manager is running at port 9527. You can access the Pulsar Manager UI at http://127.0.0.1:9527/#/environments.

    If you are deploying Pulsar Manager 0.1.0 using the released container, you can log in the Pulsar Manager UI using the following credentials.

    * Account: `pulsar`
    * Password: `pulsar`

    If you are deploying Pulsar Manager using the latest code, you can create a super-user using the following command. Then you can use the super user credentials to log in the Pulsar Manager UI.

    ```
    CSRF_TOKEN=$(curl http://backend-service:7750/pulsar-manager/csrf-token)
    curl \
        -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
        -H "Cookie: XSRF-TOKEN=$CSRF_TOKEN;" \
        -H 'Content-Type: application/json' \
        -X PUT http://backend-service:7750/pulsar-manager/users/superuser \
        -d '{"name": "admin", "password": "apachepulsar", "description": "test", "email": "username@test.org"}'
    ```

    * `backend-service`: The IP address or domain name of the backend service.
    * `password`: The password should be more than or equal to 6 digits.

2. Create an environment.

    An environment represents a Pulsar instance or a group of clusters you want to manage. A Pulsar Manager is capable of managing multiple environments.

    - Click "New Environment" button to add an environment.
    - Input the "Environment Name". The environment name is used for identifying an environment.
    - Input the "Service URL". The Service URL is the admin service url of your Pulsar cluster.
        - You need to make sure the service url that Pulsar Manager is able to access. In this example, both pulsar container and pulsar-manager container are linked. So you can use pulsar container name as the domain name of the pulsar standalone cluster. Thus you can type `http://pulsar-standalone:8080`.
    - Input the "Bookie URL". In this example, you can type `http://pulsar-standalone:6650`

## Configure Pulsar Manager

### Back end

For more information about the back end, see [pulsar-manager-backend](https://github.com/apache/pulsar-manager/blob/master/src/README.md).

### Front end

For more information about the front end, see [pulsar-manager-frontend](https://github.com/apache/pulsar-manager/blob/master/front-end/README.md).

## Features

* Tenants Management
* Namespaces Management
* Topics Management
* Subscriptions Management
* Brokers Management
* Clusters Management
* Dynamic environments with multiple changes
* Support JWT Auth

### Log in

Use the default account (`pulsar`) and the default password (`pulsar`) to log in.

![pulsar-manager-login](docs/img/pulsar-manager-login.gif)

### Configure environment

The pulsar-manager supports multiple environment configurations and can manage multiple environments conveniently.

Here, the service URL represents the service IP address of the broker. If you run Pulsar manager in the standalone mode, it should be set to "http://127.0.0.1:8080".
You can easily find it in the client.conf file of your pulsar-manager.

And the bookie URL represents the service IP address of the bookkeeper. If you run Pulsar manager in the standalone mode, it should be set to "http://127.0.0.1:6650".

![pulsar-manager-environments](docs/img/pulsar-manager-environments.gif)

### Manage tenants

![pulsar-manager-tenants](docs/img/pulsar-manager-tenants.gif)

### Manage namespaces

![pulsar-manager-namespaces](docs/img/pulsar-manager-namespaces.gif)

### Manage topics

![pulsar-manager-topics](docs/img/pulsar-manager-topics.gif)


### Manage subscriptions

![pulsar-manager-subscriptions](docs/img/pulsar-manager-subscriptions.gif)

### Manage clusters

![pulsar-manager-clusters](docs/img/pulsar-manager-clusters.gif)

### Manage brokers

![pulsar-manager-brokers](docs/img/pulsar-manager-brokers.gif)


### Topics monitoring

The pulsar-manager can monitor topics and subscriptions.

![pulsar-manager-topics-monitors](docs/img/pulsar-manager-topics-monitors.gif)

### Manage token

![pulsar-manager-token](docs/img/pulsar-manager-token.gif)

## Casdoor


### Casdoor Installation

You can use casdoor to realize sso.

Casdoor can connect to Pulsar-manager simply.

Because the code for connecting the casdoor has been added in Pulsar-manager, we need to configure the casdoor in the back-end and front-end.

#### Step1. Deploy Casdoor

Firstly, the Casdoor should be deployed.

You can refer to the Casdoor official documentation for the [Casdoor](https://casdoor.org/docs/overview)

After a successful deployment, you need to ensure:

- The Casdoor server is successfully running on **http://localhost:8000**.
- Open your favorite browser and visit **http://localhost:7001**, you will see the login page of Casdoor.
- Input `admin` and `123` to test login functionality is working fine.

Then you can quickly implement a casdoor based login page in your app with the following steps.

#### step2. Configure Casdoor

Configure casdoor can refer to [casdoor](https://door.casdoor.com/login)(Configure casdoor's browser better not use one browser with your develop browser).

You also should configure the organization, and application, you also can refer to [casdoor](https://door.casdoor.com/login).

##### step2.1 you should create an organization

![organization](/docs/img/Pulsar-manager_editOrganization.svg)

##### step2.2 you should create an application

![application](/docs/img/Pulsar-manager_editApplication.svg)

#### Step3. Configure back-end code

You should configure casdoor's Configuration in the Line 154 of pulsar-manager/src/main/resources/application.properties

```ini
casdoor.endpoint=http://localhost:8000
casdoor.clientId=<client id in previous step>
casdoor.clientSecret=<client Secret in previous step>
casdoor.certificate=<client certificate in previous step>
casdoor.organizationName=pulsar
casdoor.applicationName=app-pulsar
```

#### Step4. Configure front-end code

You also need configure casdoor's Configuration in the Line 50 of pulsar-manager/front-end/src/main.js

```
const config = {
  serverUrl: "http://localhost:7001",
  clientId: "6ba06c1e1a30929fdda7",
  organizationName: "pulsar",
  appName: "app-plusar",
  redirectPath: "/#callback",
};
```

Now you can use Casdoor.

## Development

### Default Test database HerdDB

#### Introduction

Pulsar Manager bundles JDBC Drivers for [HerdDB](https://github.com/diennea/herddb).
The default configuration starts and embedded in-memory only HerdDB database.

HerdDB can be used in production, you just have to use the  correct JDBC URL.
Follow the instructions in [application.properties](https://github.com/apache/pulsar-manager/blob/master/src/main/resources/application.properties) to switch the connection to a standalone HerdDB service or cluster.

The JDBC URL will look like this:
jdbc:herddb:server:localhost:7000

In cluster mode HerdDB uses Apache BookKeeper and Apache ZooKeeper to store data and metadata, you can share your ZooKeeper cluster and the Bookies bundled with Pulsar.

The JDBC URL will look like this:
jdbc:herddb:zookeeper:localhost:2181/herddb

In order to start and setup an HerdDB database follow the instructions on the [HerdDB documentation](https://github.com/diennea/herddb/wiki).

---

### Optimization of Topics and Namespaces**

#### **Optimization Notes:**
1. Many log topics (`logs.ingestion-system`, `logs.formatting-system`, etc.) can be merged under one topic with system identification added in metadata.
2. Status topics can also be merged into a common `status.systems` topic with a similar approach.
3. Event topics (`backpressure`, `system-alerts`, `error-events`) are distinct but can be grouped under a single namespace for alerts.

---

### **Optimized Table**

| **Namespace**           | **Topic**               | **Message Type** | **Source**                | **Destination**               | **System**                  | **Input Sink**       | **Output Sink**         |
|--------------------------|-------------------------|------------------|---------------------------|--------------------------------|-----------------------------|----------------------|--------------------------|
| `ingestion`              | `data.input`           | `data`           | CSV, XML, JSON, MQTT      | Ingestion System              | Ingestion System            | REST API, MQTT       | Apache Pulsar Topic      |
| `ingestion`              | `data.merged-streams`  | `data`           | Ingestion System          | Formatting System             | Ingestion System            | Pulsar Input         | Pulsar Output           |
| `processing`             | `data.processing-flags`| `data`           | Formatting System         | Analysis System               | Formatting System           | Pulsar Input         | Pulsar Output           |
| `analysis`               | `data.analysis-results`| `data`           | Analysis System           | Dashboard / Operational DB    | Analysis System             | Pulsar Input         | PostgreSQL / Pulsar Sink|
| `monitoring`             | `status.systems`       | `status`         | Any System                | Monitoring System             | Monitoring System           | REST API, Pulsar     | Prometheus, Pulsar      |
| `alerts`                 | `event.alerts`         | `event`          | Any System                | Notification System           | Notification System         | Metrics Collector    | Email/SMS/Webhooks      |
| `logging`                | `logs.system-logs`     | `log`            | Any System                | Central Log Store             | Logging System              | FluentBit            | Elasticsearch           |
| `error-handling`         | `event.errors`         | `event`          | Any System                | Error Management System       | Error Handling System       | Pulsar               | Alerts / Logs           |

---

### **Final Optimized Details**
1. **Topics:**
   - Data: `data.input`, `data.merged-streams`, `data.processing-flags`, `data.analysis-results`.
   - Logs: Unified as `logs.system-logs`.
   - Events: `event.alerts`, `event.errors`.
   - Status: Unified as `status.systems`.

2. **Namespaces:**
   - Simplified to `ingestion`, `processing`, `analysis`, `monitoring`, `alerts`, `logging`, `error-handling`.

3. **Metadata Usage:**
   - System-specific details (e.g., `ingestion-system`, `formatting-system`) are added as metadata fields in logs and status messages for filtering and processing.

This optimized structure reduces redundancy while retaining flexibility for system identification and routing. Let me know if you need additional refinements or explanations!