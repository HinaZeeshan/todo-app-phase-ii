"""
Authentication service layer with business logic and validation.
"""

from uuid import UUID
from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt
from datetime import datetime, timedelta
import re

from ..models.user import User
from ..models.auth_event import EventType
from ..repositories.user_repository import UserRepository
from ..repositories.auth_event_repository import AuthEventRepository
from ..schemas.auth import SignupRequest, LoginRequest
from ..config import settings


class AuthService:
    """Service for authentication business logic."""

    def __init__(self, db: AsyncSession, request: Request = None):
        """
        Initialize service with database session.

        Args:
            db: Async SQLAlchemy session
            request: FastAPI request object for logging (optional)
        """
        self.repository = UserRepository(db)
        self.event_repository = AuthEventRepository(db)
        self.request = request

    def create_access_token(self, data: dict) -> str:
        """
        Create a JWT access token with user claims.

        Args:
            data: Dictionary containing user claims (user_id, email, etc.)

        Returns:
            Encoded JWT token string
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(hours=24)  # 24-hour token
        to_encode.update({"exp": expire.timestamp()})
        encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return encoded_jwt

    async def signup(self, signup_data: SignupRequest) -> tuple[User, str]:
        """
        Create a new user account and return JWT token.

        Args:
            signup_data: Signup request with email and password

        Returns:
            Tuple of (User object, JWT access token)

        Raises:
            HTTPException: 409 if email already exists
        """
        # Check if user already exists
        existing_user = await self.repository.get_user_by_email(signup_data.email)
        if existing_user:
            await self.log_auth_event(EventType.SIGNUP, success=False, failure_reason="EMAIL_EXISTS")
            raise HTTPException(
                status_code=409,
                detail="Email already registered"
            )

        # Create new user
        user = await self.repository.create_user(signup_data.email, signup_data.password)

        # Generate JWT token
        token_data = {
            "user_id": str(user.id),
            "email": user.email,
        }
        token = self.create_access_token(token_data)

        # Log successful signup event
        await self.log_auth_event(EventType.SIGNUP, user.id, success=True)

        return user, token

    async def login(self, login_data: LoginRequest) -> tuple[User, str]:
        """
        Authenticate user and return JWT token.

        Args:
            login_data: Login request with email and password

        Returns:
            Tuple of (User object, JWT access token)

        Raises:
            HTTPException: 401 if credentials are invalid
        """
        # Retrieve user by email
        user = await self.repository.get_user_by_email(login_data.email)
        if not user or not self.repository.verify_password(login_data.password, user.password_hash):
            await self.log_auth_event(EventType.LOGIN_FAILED, user.id if user else None, success=False, failure_reason="INVALID_CREDENTIALS")
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials"
            )

        # Update last login timestamp
        await self.repository.update_last_login(user)

        # Generate JWT token
        token_data = {
            "user_id": str(user.id),
            "email": user.email,
        }
        token = self.create_access_token(token_data)

        # Log successful login event
        await self.log_auth_event(EventType.LOGIN, user.id, success=True)

        return user, token

    async def log_auth_event(
        self,
        event_type: EventType,
        user_id: UUID = None,
        success: bool = True,
        failure_reason: str = None
    ):
        """
        Log authentication event for security monitoring.

        Args:
            event_type: Type of authentication event
            user_id: Associated user ID (if available)
            success: Whether the event was successful
            failure_reason: Reason for failure (if applicable)
        """
        # Extract IP address and user agent from request if available
        ip_address = None
        user_agent = None

        if self.request:
            # Get IP address from request
            if hasattr(self.request, "client") and self.request.client:
                ip_address = self.request.client.host

            # Get user agent from headers
            user_agent = self.request.headers.get("user-agent")

        # Log the event to database
        await self.event_repository.log_auth_event(
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason
        )