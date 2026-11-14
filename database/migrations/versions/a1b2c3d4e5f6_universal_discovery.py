"""universal automatic documentation discovery schema

Revision ID: a1b2c3d4e5f6
Revises: 9a1b2c3d4e5f
Create Date: 2026-11-14 18:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy import Text

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '9a1b2c3d4e5f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. technologies
    op.create_table(
        'technologies',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('ecosystem', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('website_url', sa.String(length=2048), nullable=True),
        sa.Column('repository_url', sa.String(length=2048), nullable=True),
        sa.Column('is_official', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('technologies', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_technologies_slug'), ['slug'], unique=True)

    # 2. technology_relations
    op.create_table(
        'technology_relations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('source_tech_id', sa.String(length=36), nullable=False),
        sa.Column('target_tech_id', sa.String(length=36), nullable=False),
        sa.Column('relation_type', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['source_tech_id'], ['technologies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_tech_id'], ['technologies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_tech_id', 'target_tech_id', 'relation_type', name='uq_tech_relation'),
    )
    with op.batch_alter_table('technology_relations', schema=None) as batch_op:
        batch_op.create_index('ix_tech_rel_source', ['source_tech_id'], unique=False)
        batch_op.create_index('ix_tech_rel_target', ['target_tech_id'], unique=False)

    # 3. discovery_candidates
    op.create_table(
        'discovery_candidates',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('technology_id', sa.String(length=36), nullable=True),
        sa.Column('candidate_url', sa.String(length=2048), nullable=False),
        sa.Column('canonical_domain', sa.String(length=255), nullable=False),
        sa.Column('documentation_type', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('discovery_provider', sa.String(length=100), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('classification', sa.String(length=50), nullable=False),
        sa.Column('verification_status', sa.String(length=50), nullable=False),
        sa.Column('evidence', sa.JSON().with_variant(postgresql.JSONB(astext_type=Text()), 'postgresql'), nullable=False),
        sa.Column('license_info', sa.String(length=100), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('discovered_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('registered_source_id', sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(['registered_source_id'], ['documentation_sources.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['technology_id'], ['technologies.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('discovery_candidates', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_discovery_candidates_canonical_domain'), ['canonical_domain'], unique=False)
        batch_op.create_index('ix_discovery_candidate_status', ['verification_status'], unique=False)
        batch_op.create_index('ix_discovery_candidate_score', ['confidence_score'], unique=False)
        batch_op.create_index('ix_discovery_candidate_classification', ['classification'], unique=False)

    # 4. discovery_provider_configs
    op.create_table(
        'discovery_provider_configs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('provider_name', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False),
        sa.Column('quota_limit_daily', sa.Integer(), nullable=False),
        sa.Column('requests_today', sa.Integer(), nullable=False),
        sa.Column('last_reset_day', sa.String(length=20), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('configuration', sa.JSON().with_variant(postgresql.JSONB(astext_type=Text()), 'postgresql'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('discovery_provider_configs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_discovery_provider_configs_provider_name'), ['provider_name'], unique=True)

    # 5. discovery_events
    op.create_table(
        'discovery_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('provider_name', sa.String(length=100), nullable=False),
        sa.Column('candidate_id', sa.String(length=36), nullable=True),
        sa.Column('technology_name', sa.String(length=255), nullable=True),
        sa.Column('details', sa.JSON().with_variant(postgresql.JSONB(astext_type=Text()), 'postgresql'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('discovery_events', schema=None) as batch_op:
        batch_op.create_index('ix_discovery_events_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_discovery_events_type', ['event_type'], unique=False)

    # 6. discovery_global_configs
    op.create_table(
        'discovery_global_configs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('is_discovery_paused', sa.Boolean(), nullable=False),
        sa.Column('auto_registration_enabled', sa.Boolean(), nullable=False),
        sa.Column('min_confidence_auto_register', sa.Float(), nullable=False),
        sa.Column('excluded_technologies', sa.JSON().with_variant(postgresql.JSONB(astext_type=Text()), 'postgresql'), nullable=False),
        sa.Column('rejected_domains', sa.JSON().with_variant(postgresql.JSONB(astext_type=Text()), 'postgresql'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('discovery_global_configs')
    op.drop_table('discovery_events')
    op.drop_table('discovery_provider_configs')
    op.drop_table('discovery_candidates')
    op.drop_table('technology_relations')
    op.drop_table('technologies')
