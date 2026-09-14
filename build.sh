#!/bin/bash
# Render build script: install + seed
pip install -r backend/requirements.txt
cd backend
python -c "from app.db.base import Base; from app.db.session import engine; Base.metadata.create_all(bind=engine); print('tables ok')"
python seed.py
