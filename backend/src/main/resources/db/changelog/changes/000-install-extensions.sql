-- liquibase formatted sql

-- changeset stageboard:000-install-extensions dbms:postgresql runOnChange:true
-- comment: Install uuid-ossp extension for UUID generation functions (PostgreSQL only)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
-- rollback DROP EXTENSION IF EXISTS "uuid-ossp";
