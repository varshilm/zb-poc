# TeethDreamer wrapper — deploy on NVIDIA GPU hosts only.
FROM nvidia/cuda:11.6.2-cudnn8-runtime-ubuntu20.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY app.py .

ENV TEETHDREAMER_HOME=/opt/TeethDreamer
ENV PORT=5003

EXPOSE 5003
CMD ["python3", "app.py"]
