FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY backend/ ./backend/

RUN cd backend && python -c "from app.db.base import Base; from app.db.session import engine; Base.metadata.create_all(bind=engine); print('tables created')"

EXPOSE 8000

CMD ["sh", "-c", "cd backend && python seed.py && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
