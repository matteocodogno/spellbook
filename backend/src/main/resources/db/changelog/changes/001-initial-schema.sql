-- liquibase formatted sql

-- changeset stageboard:001
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE teams (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email         TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    avatar_url    TEXT,
    provider      TEXT NOT NULL,
    provider_id   TEXT NOT NULL,
    password_hash TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_id)
);

CREATE TABLE workshops (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    published    BOOLEAN NOT NULL DEFAULT FALSE,
    created_by   UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE phases (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    position    INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workshop_id, position)
);

CREATE TABLE steps (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id   UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    type       TEXT NOT NULL,
    position   INTEGER NOT NULL,
    content    JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (phase_id, position)
);

CREATE TABLE workshop_versions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id  UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    version      INTEGER NOT NULL,
    label        TEXT NOT NULL DEFAULT '',
    snapshot     JSONB NOT NULL,
    created_by   UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workshop_id, version)
);

CREATE TABLE workshop_locks (
    workshop_id UUID PRIMARY KEY REFERENCES workshops(id) ON DELETE CASCADE,
    locked_by   UUID NOT NULL REFERENCES users(id),
    expires_at  TIMESTAMPTZ NOT NULL
);
