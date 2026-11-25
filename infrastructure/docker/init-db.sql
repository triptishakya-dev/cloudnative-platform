-- Docker Compose init script — runs once on first container start
-- Creates a separate database for each service so they are fully isolated.

CREATE DATABASE catalog_db;
CREATE DATABASE order_db;
CREATE DATABASE notification_db;

-- Grant the shared user access to both databases
GRANT ALL PRIVILEGES ON DATABASE catalog_db TO cloudnative;
GRANT ALL PRIVILEGES ON DATABASE order_db TO cloudnative;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO cloudnative;

CREATE DATABASE auth_db;
GRANT ALL PRIVILEGES ON DATABASE auth_db TO cloudnative;
