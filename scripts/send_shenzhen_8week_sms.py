#!/usr/bin/env python3
"""Send Shenzhen 8-week program onboarding SMS via macOS Messages.

Default mode is a dry run. Add --send to actually send messages.
Requires an iPhone with Settings > Messages > Text Message Forwarding enabled
for this Mac, and Messages automation permission on macOS.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class Recipient:
    name: str
    phone: str


RECIPIENTS: tuple[Recipient, ...] = (
    Recipient("이주영", "01082135410"),
    Recipient("조형관", "01096549799"),
    Recipient("박범우", "01083921358"),
    Recipient("이승연", "01034452321"),
    Recipient("김주영", "010-3862-3232"),
    Recipient("김지영", "010-2042-4832"),
    Recipient("최예진", "01093003583"),
    Recipient("동신혁", "01087394855"),
    Recipient("선종수", "01083213735"),
    Recipient("서강훈", "01080251878"),
    Recipient("김기성", "01075295710"),
    Recipient("이찬희", "01028945198"),
    Recipient("김재한", "01094701239"),
)


MESSAGE_TEMPLATE = """안녕하세요! 엑스온트레이닝입니다 😊

선전 8주 프로그램을 신청해 주셔서 감사합니다.

프로그램 기간 동안 수행하실 WOD는 엑스온 전용 앱을 통해 제공됩니다 💪

📱 iOS 사용자는 아래 링크에서 앱을 다운로드해 주세요.
https://apps.apple.com/kr/app/xon-training/id6760121153

앱 다운로드 후 회원가입을 완료하신 뒤, 가입하신 성함을 답장으로 보내주시면 프로그램 구독이 가능한 상태로 처리해드리겠습니다.

⚠️ 회원가입 시 신청자 성함과 휴대폰 번호를 정확히 입력해 주셔야 확인이 가능합니다.

🤖 갤럭시 사용자는 구글스토어에 로그인된 이메일 주소를 답장으로 보내주시면, 다운로드 가능한 링크를 안내드리겠습니다.

감사합니다.
엑스온트레이닝 드림"""


def normalize_korean_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 11 and digits.startswith("010"):
        return f"+82{digits[1:]}"
    raise ValueError(f"Unsupported phone number format: {phone}")


def build_message(name: str) -> str:
    return f"{name}님, {MESSAGE_TEMPLATE}"


def send_with_messages(phone: str, message: str) -> None:
    script = """
on run argv
  set targetPhone to item 1 of argv
  set targetMessage to item 2 of argv

  tell application "Messages"
    activate
    set targetService to missing value

    try
      set targetService to 1st service whose service type = SMS
    end try

    if targetService is missing value then
      try
        set targetService to 1st service whose service type = iMessage
      end try
    end if

    if targetService is missing value then
      error "Messages 앱에서 사용 가능한 SMS/iMessage 서비스가 없습니다."
    end if

    set targetBuddy to buddy targetPhone of targetService
    send targetMessage to targetBuddy
  end tell
end run
"""
    subprocess.run(
        ["osascript", "-e", script, phone, message],
        check=True,
        text=True,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send the Shenzhen 8-week program onboarding SMS."
    )
    parser.add_argument(
        "--send",
        action="store_true",
        help="Actually send messages. Without this flag, prints a dry run.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Seconds to wait between sent messages. Default: 2.0",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Send or preview only the first N recipients for testing.",
    )
    parser.add_argument(
        "--only",
        default=None,
        help="Send or preview only one recipient by exact name.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    recipients = list(RECIPIENTS)

    if args.only:
        recipients = [recipient for recipient in recipients if recipient.name == args.only]
        if not recipients:
            print(f"No recipient found for --only {args.only}", file=sys.stderr)
            return 1

    if args.limit is not None:
        recipients = recipients[: args.limit]

    mode = "SEND" if args.send else "DRY RUN"
    print(f"[{mode}] {len(recipients)} message(s)")

    for index, recipient in enumerate(recipients, start=1):
        phone = normalize_korean_phone(recipient.phone)
        message = build_message(recipient.name)
        print(f"\n[{index}/{len(recipients)}] {recipient.name} {phone}")

        if not args.send:
            print(message)
            continue

        try:
            send_with_messages(phone, message)
            print("sent")
        except subprocess.CalledProcessError as error:
            print(f"failed: {error}", file=sys.stderr)
            return error.returncode or 1

        if index < len(recipients):
            time.sleep(args.delay)

    if not args.send:
        print("\nDry run only. Add --send to actually send SMS messages.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
