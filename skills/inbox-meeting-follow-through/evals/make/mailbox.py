"""Render a made-up mailbox export as one plain-text file.

Each conversation is a list of messages. The export puts conversations newest first (by their latest
message) and messages oldest first inside each one, the way a printed or pasted thread reads.
"""
from datetime import datetime

RULE = "=" * 70
THIN = "-" * 70


def fmt_dt(dt):
    hour = dt.strftime("%I").lstrip("0")
    return f"{dt.strftime('%A, %B')} {dt.day}, {dt.year}, {hour}:{dt.strftime('%M %p')}"


def render(header_lines, conversations):
    convs = sorted(conversations, key=lambda c: max(m["date"] for m in c["messages"]), reverse=True)
    out = list(header_lines)
    out.append("")
    total = len(convs)
    for i, c in enumerate(convs, 1):
        out += [RULE, f"CONVERSATION {i} of {total}", f"Subject: {c['subject']}",
                f"Messages: {len(c['messages'])}", RULE, ""]
        msgs = sorted(c["messages"], key=lambda m: m["date"])
        for j, m in enumerate(msgs):
            out.append(f"From: {m['from']}")
            out.append(f"To: {m['to']}")
            if m.get("cc"):
                out.append(f"Cc: {m['cc']}")
            if m.get("reply_to"):
                out.append(f"Reply-To: {m['reply_to']}")
            out.append(f"Date: {fmt_dt(m['date'])}")
            out.append(f"Subject: {m.get('subject', c['subject'])}")
            if m.get("attachments"):
                out.append(f"Attachments: {m['attachments']}")
            out.append("")
            out.append(m["body"].strip("\n"))
            out.append("")
            if j < len(msgs) - 1:
                out += [THIN, ""]
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def d(y, mo, day, h, mi):
    return datetime(y, mo, day, h, mi)
