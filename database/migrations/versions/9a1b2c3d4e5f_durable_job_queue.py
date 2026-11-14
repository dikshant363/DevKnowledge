"""durable job queue columns and indexes

Revision ID: 9a1b2c3d4e5f
Revises: 8f081373f4d2
Create Date: 2026-11-14 17:45:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '9a1b2c3d4e5f'
down_revision = '8f081373f4d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('crawl_jobs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('attempt_count', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='3'))
        batch_op.add_column(sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
        batch_op.add_column(sa.Column('lease_expires_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('heartbeat_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('error_details', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('idempotency_key', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('worker_id', sa.String(length=128), nullable=True))
        batch_op.create_unique_constraint('uq_crawl_jobs_idempotency_key', ['idempotency_key'])
        batch_op.create_index('ix_crawl_jobs_status_sched', ['status', 'scheduled_at'], unique=False)
        batch_op.create_index('ix_crawl_jobs_lease_exp', ['lease_expires_at'], unique=False)
        batch_op.create_index('ix_crawl_jobs_prio_sched', ['priority', 'scheduled_at'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('crawl_jobs', schema=None) as batch_op:
        batch_op.drop_index('ix_crawl_jobs_prio_sched')
        batch_op.drop_index('ix_crawl_jobs_lease_exp')
        batch_op.drop_index('ix_crawl_jobs_status_sched')
        batch_op.drop_constraint('uq_crawl_jobs_idempotency_key', type_='unique')
        batch_op.drop_column('worker_id')
        batch_op.drop_column('idempotency_key')
        batch_op.drop_column('error_details')
        batch_op.drop_column('heartbeat_at')
        batch_op.drop_column('lease_expires_at')
        batch_op.drop_column('scheduled_at')
        batch_op.drop_column('max_attempts')
        batch_op.drop_column('attempt_count')
