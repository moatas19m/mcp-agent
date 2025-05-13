"""migration create tables

Revision ID: 16c76fba4401
Revises: 83082d131e5a
Create Date: 2025-05-12 21:10:20.048587

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '16c76fba4401'
down_revision: Union[str, None] = '83082d131e5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Create the agent_types table
    op.create_table(
        'agent_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), unique=True, nullable=False),
        sa.Column('command', sa.String(), nullable=False),
        sa.Column('args', sa.JSON(), nullable=False),
        sa.Column('env_keys', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create the mcp_agents table
    op.create_table(
        'mcp_agents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), unique=True, nullable=False),
        sa.Column('agent_type', sa.String(), nullable=False),
        sa.Column('command', sa.String(), nullable=False),
        sa.Column('args', sa.JSON(), nullable=False),
        sa.Column('env', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_mcp_agents_name', 'mcp_agents', ['name'], unique=True)
    op.create_index('ix_mcp_agents_id', 'mcp_agents', ['id'], unique=False)

def downgrade():
    # Drop the tables and indexes
    op.drop_table('mcp_agents')
    op.drop_table('agent_types')
