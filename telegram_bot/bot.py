import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import uuid, asyncio, logging, json
from datetime import datetime
from telegram import Update
from telegram.ext import (
    Application, CommandHandler,
    MessageHandler, filters, ContextTypes
)
from database import get_db_session, init_db
from models   import TelegramUser, ConversationMessage
from brain    import get_ai_reply, get_opening_message, get_handoff_message

logging.basicConfig(
    format  = "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level   = logging.INFO
)
log = logging.getLogger(__name__)

TOKEN          = os.environ["TELEGRAM_BOT_TOKEN"]
MAX_AI_REPLIES = 20  # generous limit — enough for a real conversation


# ── HELPERS ────────────────────────────────────────────────────────────────

def get_or_create_user(db, tg_user, chat_id: str) -> TelegramUser:
    """Get existing user or create new one."""
    user = db.query(TelegramUser).filter_by(chat_id=chat_id).first()

    if not user:
        full_name = " ".join(filter(None, [
            tg_user.first_name or "",
            tg_user.last_name  or ""
        ])).strip()

        user = TelegramUser(
            id         = str(uuid.uuid4()),
            chat_id    = chat_id,
            username   = (tg_user.username or "").lower(),
            first_name = tg_user.first_name or "",
            last_name  = tg_user.last_name  or "",
        )
        db.add(user)
        db.commit()
        log.info(f"New user registered: {full_name} (@{tg_user.username})")
        export_users_json(db)  # Sync to JSON for Node.js

    return user


def export_users_json(db):
    """Write all registered users to users.json for the Node.js server to read."""
    users = db.query(TelegramUser).all()
    data = []
    for u in users:
        data.append({
            "username": u.username,
            "chat_id": u.chat_id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "stage": u.stage,
            "registered_at": u.created_at.isoformat() if u.created_at else None,
        })
    json_path = os.path.join(os.path.dirname(__file__), 'users.json')
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)
    log.info(f"Exported {len(data)} users to users.json")


def get_history(db, user_id: str) -> list:
    """
    Fetch full conversation history for this user.
    Returns list of { role, content } dicts.
    This is what gets sent to Groq every time.
    """
    messages = (
        db.query(ConversationMessage)
        .filter_by(user_id=user_id)
        .order_by(ConversationMessage.sent_at)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in messages]


def save_message(db, user_id: str, role: str, content: str):
    """Save a message to conversation history."""
    msg = ConversationMessage(
        id      = str(uuid.uuid4()),
        user_id = user_id,
        role    = role,
        content = content,
    )
    db.add(msg)
    db.commit()


def get_display_name(user: TelegramUser) -> str:
    return user.first_name or user.username or "there"


async def send_with_typing(update, text: str, delay: float = None):
    """
    Show typing indicator then send.
    Delay is calculated from reply length to feel human.
    """
    if delay is None:
        # ~60 words per minute typing speed
        words = len(text.split())
        delay = min(0.8 + (words * 0.05), 4.0)

    await update.message.chat.send_action("typing")
    await asyncio.sleep(delay)
    await update.message.reply_text(text)


# ── /start ─────────────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    tg_user = update.effective_user
    db      = get_db_session()

    try:
        user = get_or_create_user(db, tg_user, chat_id)
        user.last_seen_at = datetime.utcnow()
        db.commit()

        history = get_history(db, user.id)

        if history:
            # Returning user — generate a personalized welcome back
            history_with_context = history + [{
                "role":    "user",
                "content": "[System: This person is returning to the conversation. Welcome them back naturally and pick up where you left off.]"
            }]
            reply = get_ai_reply(history_with_context, get_display_name(user))
        else:
            # Brand new user — generate opening message
            reply = get_opening_message(get_display_name(user))
            # Save the opening as assistant message so history starts correctly
            save_message(db, user.id, "assistant", reply)

        await send_with_typing(update, reply, delay=1.2)
    finally:
        db.close()


# ── /stop ──────────────────────────────────────────────────────────────────

async def cmd_stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    db      = get_db_session()

    try:
        user = db.query(TelegramUser).filter_by(chat_id=chat_id).first()
        if user:
            user.stage = "unsubscribed"
            db.commit()

        await update.message.reply_text(
            "No problem at all \u2014 you've been removed from our list. "
            "If you ever want to chat again, just send /start. Take care! \U0001f44b"
        )
    finally:
        db.close()


# ── /human ─────────────────────────────────────────────────────────────────

async def cmd_human(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    db      = get_db_session()

    try:
        user = db.query(TelegramUser).filter_by(chat_id=chat_id).first()
        if user:
            user.human_takeover = True
            user.stage          = "needs_human"
            db.commit()
            name = get_display_name(user)
        else:
            name = "there"

        msg = get_handoff_message(name)
        await send_with_typing(update, msg, delay=0.8)
    finally:
        db.close()


# ── /reset — clears history for testing ───────────────────────────────────

async def cmd_reset(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    db      = get_db_session()

    try:
        user = db.query(TelegramUser).filter_by(chat_id=chat_id).first()
        if user:
            db.query(ConversationMessage).filter_by(user_id=user.id).delete()
            user.ai_reply_count = 0
            user.stage          = "new"
            user.human_takeover = False
            db.commit()

        await update.message.reply_text(
            "Conversation reset. Send /start to begin fresh!"
        )
    finally:
        db.close()


# ── MAIN MESSAGE HANDLER ───────────────────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    This handles EVERY text message.
    Every single reply goes through Groq — no hardcoded responses.
    """
    chat_id       = str(update.effective_chat.id)
    incoming_text = (update.message.text or "").strip()
    tg_user       = update.effective_user

    if not incoming_text:
        return

    db   = get_db_session()

    try:
        user = get_or_create_user(db, tg_user, chat_id)

        # ── Update last seen ───────────────────────────────────
        user.last_seen_at = datetime.utcnow()
        db.commit()

        # ── Check if unsubscribed ──────────────────────────────
        if user.stage == "unsubscribed":
            return  # Silently ignore — they opted out

        # ── Check if handed off to human ──────────────────────
        if user.human_takeover:
            await send_with_typing(
                update,
                "A team member will be in touch very soon! "
                "They have the full context of our conversation. \U0001f64f",
                delay=0.5
            )
            return

        # ── Check AI reply limit ───────────────────────────────
        if user.ai_reply_count >= MAX_AI_REPLIES:
            user.stage          = "needs_human"
            user.human_takeover = True
            db.commit()

            msg = get_handoff_message(get_display_name(user))
            await send_with_typing(update, msg, delay=1.0)
            return

        # ── Save the incoming user message to history ──────────
        # IMPORTANT: Save BEFORE generating reply
        # so Groq sees it as part of the conversation
        save_message(db, user.id, "user", incoming_text)

        # ── Get full conversation history ──────────────────────
        # This includes the message we just saved
        history = get_history(db, user.id)

        log.info(
            f"Generating reply for {get_display_name(user)} "
            f"({len(history)} messages in history)"
        )

        # ── Generate reply with Groq ───────────────────────────
        # Pass the FULL history — this is what makes it conversational
        reply = get_ai_reply(history, get_display_name(user))

        # ── Save the bot reply to history ─────────────────────
        save_message(db, user.id, "assistant", reply)

        # ── Update counters ────────────────────────────────────
        user.ai_reply_count += 1
        db.commit()

        # ── Send with human-like typing delay ─────────────────
        await send_with_typing(update, reply)

        log.info(
            f"Replied to {get_display_name(user)}: "
            f"{reply[:60]}..."
        )

    finally:
        db.close()


# ── RUN ────────────────────────────────────────────────────────────────────

def run_bot():
    init_db()
    print("\u2705 Database initialized")

    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("stop",  cmd_stop))
    app.add_handler(CommandHandler("human", cmd_human))
    app.add_handler(CommandHandler("reset", cmd_reset))

    # This catches ALL text messages that are not commands
    # Every single one goes to handle_message -> Groq
    app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND,
        handle_message
    ))

    print("\U0001f916 Telegram bot is running...")
    print("   Every reply is generated by Groq AI")
    print("   Full conversation history sent every time")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    run_bot()
