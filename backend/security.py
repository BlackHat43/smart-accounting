from fastapi import Header, Depends
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from database import get_db
from routers.auth import SECRET_KEY, ALGORITHM
import models


def get_current_user_optional(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(models.User).filter(models.User.id == int(user_id)).first()
    except (JWTError, ValueError, TypeError):
        return None