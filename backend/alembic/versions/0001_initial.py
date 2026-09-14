"""Initial schema: users, schemes, applications, documents, admin_logs.

Revision ID: 0001_initial
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("aadhaar_hash", sa.String(length=128), nullable=True),
        sa.Column("aadhaar_masked", sa.String(length=20), nullable=True),
        sa.Column("other_gov_id", sa.String(length=40), nullable=True),
        sa.Column("id_type", sa.String(length=10), nullable=False),
        sa.Column("phone", sa.String(length=15), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=False),
        sa.Column("dob", sa.Date(), nullable=False),
        sa.Column("role", sa.String(length=10), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("aadhaar_hash"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("other_gov_id"),
        sa.UniqueConstraint("phone"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_phone", "users", ["phone"])
    op.create_index("ix_users_aadhaar_hash", "users", ["aadhaar_hash"])
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "schemes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("eligibility", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("scheme_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("benefit_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("admin_id", sa.Integer(), nullable=True),
        sa.Column("decided_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scheme_id"], ["schemes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_applications_user", "applications", ["user_id"])
    op.create_index("ix_applications_scheme", "applications", ["scheme_id"])
    op.create_index("ix_applications_status", "applications", ["status"])
    op.create_index("ix_applications_created", "applications", ["created_at"])

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("file_type", sa.String(length=100), nullable=False,
                  server_default="application/octet-stream"),
        sa.Column("file_size", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("uploaded_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_application", "documents", ["application_id"])

    op.create_table(
        "admin_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_logs_application", "admin_logs", ["application_id"])
    op.create_index("ix_admin_logs_admin", "admin_logs", ["admin_id"])


def downgrade() -> None:
    op.drop_table("admin_logs")
    op.drop_table("documents")
    op.drop_table("applications")
    op.drop_table("schemes")
    op.drop_table("users")
    sa.Enum(name="applicationstatus").drop(checkfirst=True)
    sa.Enum(name="userrole").drop(checkfirst=True)
    sa.Enum(name="idtype").drop(checkfirst=True)
