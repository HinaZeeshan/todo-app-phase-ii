# Quickstart Guide: Backend Deployment Error Resolution

## Overview
This guide explains how to deploy the FastAPI backend to Hugging Face Spaces without encountering the `ModuleNotFoundError: No module named 'src'` error.

## Prerequisites
- Backend code with proper Python package structure
- Dockerfile configured for Hugging Face Spaces
- Hugging Face account for deployment

## Setup Steps

### 1. Verify Package Structure
Ensure the following files exist:
```
backend/
├── src/
│   ├── __init__.py  # This file makes 'src' a Python package
│   ├── main.py      # Contains the FastAPI app instance
│   └── ...
```

### 2. Configure Dockerfile for Hugging Face Spaces
Update your Dockerfile with these essential elements:
```dockerfile
FROM python:3.11-slim

# Set working directory to /app as expected by Hugging Face Spaces
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code to /app directory
COPY . .

# Expose port 7860 as required by Hugging Face Spaces
EXPOSE 7860

# Run the application with proper host and port
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

### 3. Environment Configuration
Set up environment variables in your Hugging Face Space:
- DATABASE_URL: Your PostgreSQL connection string
- JWT_SECRET: Secret key for JWT token signing
- CORS_ORIGINS: Comma-separated list of allowed origins

## Running Locally
To test the configuration locally:
```bash
cd backend
uvicorn src.main:app --host 0.0.0.0 --port 7860
```

## Deploying to Hugging Face Spaces
1. Push your code to a Hugging Face Hub repository
2. Create a new Space with Docker environment
3. Ensure your repository includes the properly configured Dockerfile
4. The Space will build and run using the Docker configuration

## Troubleshooting
- If you still get `ModuleNotFoundError`, verify that `src/__init__.py` exists
- Check that the Dockerfile sets WORKDIR to `/app` where your code is copied
- Ensure the uvicorn command in CMD references the correct module path