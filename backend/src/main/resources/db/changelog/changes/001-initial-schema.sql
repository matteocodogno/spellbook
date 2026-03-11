-- liquibase formatted sql

-- changeset stageboard:001
-- comment: Create initial schema with teams, users, workshops, phases, steps, workshop_versions and workshop_locks tables
CREATE TABLE teams (
    id         UUID PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id             UUID PRIMARY KEY,
    team_id        UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email          TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    password_hash  TEXT,
    oauth_provider TEXT,
    oauth_sub      TEXT,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE workshops (
    id                      UUID PRIMARY KEY,
    team_id                 UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    draft_modified_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_editor_id          UUID REFERENCES users(id),
    published_version_label TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX workshops_team_modified ON workshops(team_id, draft_modified_at DESC);

CREATE TABLE phases (
    id                UUID PRIMARY KEY,
    workshop_id       UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    estimated_minutes INT NOT NULL CHECK (estimated_minutes > 0),
    position          INT NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (workshop_id, position)
);
CREATE INDEX phases_workshop_position ON phases(workshop_id, position);

CREATE TABLE steps (
    id         UUID PRIMARY KEY,
    phase_id   UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    position   INT NOT NULL,
    content    JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (phase_id, position)
);
CREATE INDEX steps_phase_position ON steps(phase_id, position);

CREATE TABLE workshop_versions (
    id            UUID PRIMARY KEY,
    workshop_id   UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    tag           TEXT,
    snapshot      JSON NOT NULL,
    published_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX versions_workshop_published ON workshop_versions(workshop_id, published_at DESC);

CREATE TABLE workshop_locks (
    workshop_id    UUID PRIMARY KEY REFERENCES workshops(id) ON DELETE CASCADE,
    locked_by      UUID NOT NULL REFERENCES users(id),
    locked_by_name TEXT NOT NULL,
    locked_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at     TIMESTAMP WITH TIME ZONE NOT NULL
);
-- rollback DROP INDEX IF EXISTS versions_workshop_published;
-- rollback DROP TABLE IF EXISTS workshop_locks;
-- rollback DROP TABLE IF EXISTS workshop_versions;
-- rollback DROP INDEX IF EXISTS steps_phase_position;
-- rollback DROP TABLE IF EXISTS steps;
-- rollback DROP INDEX IF EXISTS phases_workshop_position;
-- rollback DROP TABLE IF EXISTS phases;
-- rollback DROP INDEX IF EXISTS workshops_team_modified;
-- rollback DROP TABLE IF EXISTS workshops;
-- rollback DROP TABLE IF EXISTS users;
-- rollback DROP TABLE IF EXISTS teams;

-- changeset stageboard:001-pg dbms:postgresql runOnChange:true
-- comment: Convert JSON columns to JSONB and add GIN index for efficient content querying (PostgreSQL only)
ALTER TABLE steps ALTER COLUMN content TYPE JSONB USING content::JSONB;
ALTER TABLE steps ALTER COLUMN content SET DEFAULT '{}';
ALTER TABLE workshop_versions ALTER COLUMN snapshot TYPE JSONB USING snapshot::JSONB;
CREATE INDEX IF NOT EXISTS steps_content_gin ON steps USING gin(content jsonb_path_ops);
-- rollback DROP INDEX IF EXISTS steps_content_gin;
-- rollback ALTER TABLE workshop_versions ALTER COLUMN snapshot TYPE JSON USING snapshot::JSON;
-- rollback ALTER TABLE steps ALTER COLUMN content TYPE JSON USING content::JSON;
