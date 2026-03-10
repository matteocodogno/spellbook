-- liquibase formatted sql

-- changeset stageboard:001
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE teams (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id        UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email          TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    password_hash  TEXT,
    oauth_provider TEXT,
    oauth_sub      TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workshops (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id                 UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    draft_modified_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_editor_id          UUID REFERENCES users(id),
    published_version_label TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX workshops_team_modified ON workshops(team_id, draft_modified_at DESC);

CREATE TABLE phases (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id       UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    estimated_minutes INT NOT NULL CHECK (estimated_minutes > 0),
    position          INT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workshop_id, position)
);
CREATE INDEX phases_workshop_position ON phases(workshop_id, position);

CREATE TABLE steps (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id   UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    position   INT NOT NULL,
    content    JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (phase_id, position)
);
CREATE INDEX steps_phase_position ON steps(phase_id, position);
CREATE INDEX steps_content_gin ON steps USING gin(content jsonb_path_ops);

CREATE TABLE workshop_versions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id   UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    tag           TEXT,
    snapshot      JSONB NOT NULL,
    published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX versions_workshop_published ON workshop_versions(workshop_id, published_at DESC);

CREATE TABLE workshop_locks (
    workshop_id    UUID PRIMARY KEY REFERENCES workshops(id) ON DELETE CASCADE,
    locked_by      UUID NOT NULL REFERENCES users(id),
    locked_by_name TEXT NOT NULL,
    locked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at     TIMESTAMPTZ NOT NULL
);
