-- liquibase formatted sql

-- changeset stageboard:000-install-extensions dbms:postgresql runOnChange:true
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
