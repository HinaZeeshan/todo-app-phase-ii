# API Contract: Backend Service (Post-Deployment Fix)

## Overview
This API contract defines the endpoints that should be accessible after the deployment fix is applied. The deployment fix itself doesn't change the API contract, but ensures the existing API is properly accessible in the Hugging Face Spaces environment.

## Base URL
- Production: `https://[your-space-name].hf.space`
- Port: `7860` (as required by Hugging Face Spaces)

## Authentication
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Endpoints

### Health Check
- **GET** `/`
  - Description: Health check endpoint
  - Authentication: None required
  - Response: `{ "status": "ok", "service": "Todo Backend API", "version": "1.0.0" }`
  - Success Code: 200

- **GET** `/health`
  - Description: Detailed health check
  - Authentication: None required
  - Response: `{ "status": "healthy", "environment": "development|production" }`
  - Success Code: 200

### Authentication (via Better Auth integration)
- **POST** `/auth/register`
  - Description: User registration
  - Authentication: None required
  - Request: `{ "email": "user@example.com", "password": "securePassword" }`
  - Response: `{ "user_id": "uuid", "token": "jwt" }`
  - Success Code: 201

- **POST** `/auth/login`
  - Description: User login
  - Authentication: None required
  - Request: `{ "email": "user@example.com", "password": "securePassword" }`
  - Response: `{ "user_id": "uuid", "token": "jwt" }`
  - Success Code: 200

### Tasks Management
- **GET** `/tasks`
  - Description: Get all tasks for authenticated user
  - Authentication: Required
  - Response: `{ "tasks": [...] }`
  - Success Code: 200

- **POST** `/tasks`
  - Description: Create a new task for authenticated user
  - Authentication: Required
  - Request: `{ "title": "Task title", "description": "Task description", "completed": false }`
  - Response: `{ "id": "task-id", "title": "...", ... }`
  - Success Code: 201

- **PUT** `/tasks/{task_id}`
  - Description: Update a specific task
  - Authentication: Required
  - Response: Updated task object
  - Success Code: 200

- **DELETE** `/tasks/{task_id}`
  - Description: Delete a specific task
  - Authentication: Required
  - Success Code: 204

## Error Responses
All endpoints may return standard HTTP error codes:
- 400: Bad Request - Invalid input
- 401: Unauthorized - Invalid or missing authentication
- 403: Forbidden - Insufficient permissions
- 404: Not Found - Resource doesn't exist
- 500: Internal Server Error - Unexpected server error

## Expected Response Format
All successful responses follow this pattern:
```json
{
  "status": "success",
  "data": { /* actual response data */ },
  "timestamp": "ISO 8601 datetime"
}
```