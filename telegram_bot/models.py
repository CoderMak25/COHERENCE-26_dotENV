from sqlalchemy import (Column, String, Text,
                        DateTime, Integer, Boolean, ForeignKey)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime, uuid

Base = declarative_base()

def new_id():
    return str(uuid.uuid4())


class TelegramUser(Base):
    """
    Stores every person who messages the bot.
    chat_id is how Telegram identifies them.
    username is their @handle.
    """
    __tablename__ = "telegram_users"

    id           = Column(String, primary_key=True, default=new_id)
    chat_id      = Column(String, unique=True, nullable=False)
    username     = Column(String, nullable=True)   # without @
    first_name   = Column(String, nullable=True)
    last_name    = Column(String, nullable=True)

    # Conversation state
    stage        = Column(String, default="new")
    # new | introduced | engaged | interested |
    # demo_requested | objecting | cold | needs_human

    ai_reply_count = Column(Integer, default=0)
    human_takeover = Column(Boolean, default=False)

    created_at   = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.datetime.utcnow)

    messages = relationship("ConversationMessage",
                            back_populates="user",
                            order_by="ConversationMessage.sent_at")


class ConversationMessage(Base):
    """
    Every single message in every conversation.
    This is what gets sent to Groq as history.
    """
    __tablename__ = "conversation_messages"

    id      = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey("telegram_users.id"),
                     nullable=False)

    # "user" = message from the person
    # "assistant" = message from the bot
    role    = Column(String, nullable=False)
    content = Column(Text, nullable=False)

    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("TelegramUser", back_populates="messages")
