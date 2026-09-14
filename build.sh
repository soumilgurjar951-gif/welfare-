#!/bin/sh
# Render build script: install deps + create tables + seed data
pip install -r backend/requirements.txt
cd backend
python -c "from app.db.base import Base; from app.db.session import engine; Base.metadata.create_all(bind=engine); print('tables created')"
python seed.py
