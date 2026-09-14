FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY build.sh .

RUN cd backend && python -c "from app.db.base import Base; from app.db.session import engine; Base.metadata.create_all(bind=engine); print('tables created')"

EXPOSE 8000

CMD ["sh", "-c", "cd backend && python seed.py && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
