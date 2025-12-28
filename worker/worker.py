import time
import requests

API_BASE = "http://api:8000"
POLL_SLEEP_SECONDS = 2
HTTP_TIMEOUT_SECONDS = 10


def get_watches():
    resp = requests.get(f"{API_BASE}/watches", timeout=HTTP_TIMEOUT_SECONDS)
    resp.raise_for_status()
    return resp.json()


def check_watch(watch):
    resp = requests.get(watch["url"], timeout=HTTP_TIMEOUT_SECONDS)
    return resp.status_code


def send_result(watch_id, status_code, error=None):
    payload = {
        "id": watch_id,
        "status": status_code,
        "error": error,
    }
    resp = requests.post(
        f"{API_BASE}/results", json=payload, timeout=HTTP_TIMEOUT_SECONDS
    )
    resp.raise_for_status()
    return resp.json()


def should_check(watch, now):
    last_checked = watch.get("last_checked") or watch.get("added_at") or 0
    interval = watch.get("interval") or 0
    return (now - last_checked) >= interval


def main():
    while True:
        now = int(time.time())
        try:
            watches = get_watches()
        except Exception as exc:
            print(f"Failed to load watches: {exc}")
            time.sleep(POLL_SLEEP_SECONDS)
            continue

        for watch in watches:
            if not watch.get("id"):
                continue
            if not should_check(watch, now):
                continue
            try:
                print(f"Checking watch {watch['id']}...")
                status = check_watch(watch)
                send_result(watch["id"], status, None)
            except Exception as exc:
                send_result(watch["id"], 0, str(exc))

        time.sleep(POLL_SLEEP_SECONDS)


if __name__ == "__main__":
    main()