from groq import Groq
import os, re

client = Groq(api_key=os.environ["GROQ_API_KEY"])
MODEL  = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are OutreachBot, a friendly and professional sales assistant for TechVault Solutions — a company that provides business software tools including CRM systems, inventory management, automated billing, HR management software, and customer support platforms for small and medium businesses.

Your ONE job in the first message is always to ask the customer one specific question:
"What kind of business challenge are you looking to solve right now — managing customers, tracking inventory, handling billing, managing your team, or something else?"

After they answer, the entire conversation stays focused on understanding their business problem and matching it to one of our solutions.

Conversation rules:
- Never go off-topic — if they ask something unrelated to business software or their operations, gently bring it back
- Ask one follow-up question at a time to understand their exact problem
- When they need detailed pricing, contracts, or technical specs say: "For the full details on this, it's best to reach us directly at sales@techvault.io — they'll get back to you within a few hours"
- When they seem ready to buy or want a demo say: "You can book a quick demo or drop us a note at sales@techvault.io and our team will set everything up for you"
- Keep replies under 70 words
- Sound like a real helpful human, not a chatbot
- Never use bullet points — write conversationally
- Do not use hollow phrases like "Great choice!" or "Absolutely!"
- Always end with either one question or one clear next step
- If they are clearly not interested, be gracious and say they can always reach us at sales@techvault.io if they change their mind"""


def get_ai_reply(conversation_history: list, user_name: str = "") -> str:
    """
    Takes the full conversation history and generates the next reply.
    conversation_history = list of { role: "user"|"assistant", content: str }
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    for msg in conversation_history:
        if msg["role"] in ("user", "assistant"):
            messages.append({
                "role":    msg["role"],
                "content": msg["content"]
            })

    try:
        response = client.chat.completions.create(
            model       = MODEL,
            messages    = messages,
            max_tokens  = 200,
            temperature = 0.85,
        )
        reply = response.choices[0].message.content.strip()
        reply = clean_reply(reply)
        return reply

    except Exception as e:
        print(f"Groq error: {e}")
        return (
            "Sorry, I'm having a quick technical hiccup. "
            "Give me a moment and try again!"
        )


def get_opening_message(user_name: str) -> str:
    """
    Generates the very first message when someone starts the bot.
    Personalized to their name.
    """
    first = user_name.split()[0] if user_name else "there"

    prompt = f"""
Write a very short, warm, natural first message to someone named {first}
who just started a Telegram conversation with us.

We are TechVault Solutions — we provide business software tools (CRM, inventory management, billing, HR, customer support) for small and medium businesses.

Rules:
- Under 50 words
- Sound like a real helpful person, not a chatbot
- Greet them warmly and ask this specific question:
  "What kind of business challenge are you looking to solve right now — managing customers, tracking inventory, handling billing, managing your team, or something else?"
- No hollow openers like "Hope you're doing well!"
"""

    try:
        response = client.chat.completions.create(
            model       = MODEL,
            messages    = [{"role": "user", "content": prompt}],
            max_tokens  = 100,
            temperature = 0.9,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return (
            f"Hey {first}! Glad you reached out. "
            f"What are you working on these days?"
        )


def get_handoff_message(user_name: str) -> str:
    """
    When AI limit is reached or human is requested.
    """
    first = user_name.split()[0] if user_name else "there"

    prompt = f"""
Write a short warm Telegram message telling {first} that a real team 
member will follow up with them soon.

Rules:
- Under 35 words  
- Do not make it sound like a call center transfer
- Sound genuinely warm
- No corporate language
"""
    try:
        response = client.chat.completions.create(
            model       = MODEL,
            messages    = [{"role": "user", "content": prompt}],
            max_tokens  = 60,
            temperature = 0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return (
            f"Thanks for the great chat {first}! "
            f"I'll have someone from the team follow up with you personally. \U0001f64f"
        )


def clean_reply(text: str) -> str:
    """Remove common AI artifacts."""
    # Remove surrounding quotes
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1]

    # Remove "Alex:" or "Assistant:" prefix
    text = re.sub(
        r'^(Alex|Assistant|AI|Bot|Me):\s*',
        '', text, flags=re.IGNORECASE
    )

    # Remove hollow openers
    for pattern in [
        r'^Great!?\s*', r'^Absolutely!?\s*', r'^Certainly!?\s*',
        r'^Of course!?\s*', r'^Sure thing!?\s*', r'^Indeed!?\s*',
        r'^Fantastic!?\s*', r'^Wonderful!?\s*', r'^Awesome!?\s*',
    ]:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    return text.strip()
