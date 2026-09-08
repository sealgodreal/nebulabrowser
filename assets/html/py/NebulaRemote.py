import asyncio
import importlib
import json
import fractions
import subprocess
import sys
import time
import traceback


def ensure_package(module_name, package_name, optional=False):
    try:
        importlib.import_module(module_name)
        return True
    except ImportError:
        print(f"Installing missing dependency: {package_name}")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
            importlib.invalidate_caches()
            importlib.import_module(module_name)
            return True
        except (ImportError, subprocess.CalledProcessError):
            if optional:
                print(f"[warn] Unable to install {package_name}; related features disabled.")
                return False
            raise


for module_name, package_name in (
    ("websockets", "websockets"),
    ("numpy", "numpy"),
    ("aiortc", "aiortc"),
    ("av", "av"),
):
    ensure_package(module_name, package_name)

_MSS_AVAILABLE = ensure_package("mss", "mss", optional=True)
_PIL_AVAILABLE = ensure_package("PIL", "pillow", optional=True)
_PYNPUT_AVAILABLE = ensure_package("pynput", "pynput", optional=True)

import websockets
import numpy as np

from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    RTCDataChannel,
    RTCConfiguration,
    RTCIceServer,
    VideoStreamTrack,
)
from av import VideoFrame

if _MSS_AVAILABLE:
    import mss as _mss
if _PIL_AVAILABLE:
    from PIL import Image as PILImage
if _PYNPUT_AVAILABLE:
    from pynput.mouse import Button as MButton, Controller as MouseController
    from pynput.keyboard import Key, Controller as KeyboardController

SIGNALING_URL = "wss://nremotebackendbysealgod.onrender.com"

ICE_SERVERS = [
    {"urls": "stun:stun.l.google.com:19302"},
    {"urls": "stun:stun1.l.google.com:19302"},
    {
        "urls":       "turn:openrelay.metered.ca:80",
        "username":   "openrelayproject",
        "credential": "openrelayproject",
    },
    {
        "urls":       "turn:openrelay.metered.ca:443",
        "username":   "openrelayproject",
        "credential": "openrelayproject",
    },
    {
        "urls":       "turn:openrelay.metered.ca:443?transport=tcp",
        "username":   "openrelayproject",
        "credential": "openrelayproject",
    },
]

def make_ice_config():
    return RTCConfiguration(iceServers=[
        RTCIceServer(
            urls=s["urls"],
            username=s.get("username"),
            credential=s.get("credential"),
        )
        for s in ICE_SERVERS
    ])

mouse    = MouseController()    if _PYNPUT_AVAILABLE else None
keyboard = KeyboardController() if _PYNPUT_AVAILABLE else None

MOUSE_BUTTON_MAP = {
    0: MButton.left,
    1: MButton.middle,
    2: MButton.right,
} if _PYNPUT_AVAILABLE else {}

SPECIAL_KEY_MAP = {} if not _PYNPUT_AVAILABLE else {
    "Enter":     Key.enter,    "Tab":       Key.tab,
    "Backspace": Key.backspace,"Delete":    Key.delete,
    "Escape":    Key.esc,      "ArrowUp":   Key.up,
    "ArrowDown": Key.down,     "ArrowLeft": Key.left,
    "ArrowRight":Key.right,    "Home":      Key.home,
    "End":       Key.end,      "PageUp":    Key.page_up,
    "PageDown":  Key.page_down,"Insert":    Key.insert,
    "F1":Key.f1,  "F2":Key.f2,  "F3":Key.f3,  "F4":Key.f4,
    "F5":Key.f5,  "F6":Key.f6,  "F7":Key.f7,  "F8":Key.f8,
    "F9":Key.f9,  "F10":Key.f10,"F11":Key.f11,"F12":Key.f12,
    "CapsLock":  Key.caps_lock,"Shift":     Key.shift,
    "Control":   Key.ctrl,     "Alt":       Key.alt,
    "Meta":      Key.cmd,      " ":         Key.space,
}


def get_monitor_size():
    if _MSS_AVAILABLE:
        with _mss.MSS() as sct:
            m = sct.monitors[1]
            return m["width"], m["height"]
    return 1920, 1080


def handle_input_event(raw: str, screen_w: int, screen_h: int):
    if not _PYNPUT_AVAILABLE:
        return
    try:
        ev = json.loads(raw)
    except Exception:
        return
    t = ev.get("type")

    if t == "mousemove":
        mouse.position = (int(ev["rx"] * screen_w), int(ev["ry"] * screen_h))

    elif t in ("mousedown", "mouseup"):
        btn = MOUSE_BUTTON_MAP.get(ev.get("button", 0), MButton.left)
        (mouse.press if t == "mousedown" else mouse.release)(btn)

    elif t == "wheel":
        dx, dy = ev.get("deltaX", 0), ev.get("deltaY", 0)
        mode = ev.get("deltaMode", 0)
        if mode == 1: dx *= 40; dy *= 40
        elif mode == 2: dx *= 800; dy *= 800
        mouse.scroll(int(-dx / 40), int(-dy / 40))

    elif t in ("keydown", "keyup"):
        key_name = ev.get("key", "")
        pkey = SPECIAL_KEY_MAP.get(key_name) or (key_name if len(key_name) == 1 else None)
        if pkey is None:
            return
        try:
            (keyboard.press if t == "keydown" else keyboard.release)(pkey)
        except Exception:
            pass

class ScreenCaptureTrack(VideoStreamTrack):
    kind = "video"

    def __init__(self, fps: int = 30):
        super().__init__()
        self._fps            = fps
        self._frame_interval = 1.0 / fps
        self._pts            = 0
        self._time_base      = fractions.Fraction(1, 90000)
        self._sct_ctx        = _mss.MSS() if _MSS_AVAILABLE else None
        self._sct            = self._sct_ctx.__enter__() if self._sct_ctx else None
        self._monitor        = self._sct.monitors[1] if self._sct else None
        self._last           = time.monotonic()

    async def recv(self):
        now  = time.monotonic()
        wait = self._frame_interval - (now - self._last)
        if wait > 0:
            await asyncio.sleep(wait)
        self._last = time.monotonic()

        frame           = self._grab_frame()
        frame.pts       = self._pts
        frame.time_base = self._time_base
        self._pts      += int(90000 / self._fps)
        return frame

    def _grab_frame(self) -> VideoFrame:
        if self._sct and _PIL_AVAILABLE:
            try:
                raw = self._sct.grab(self._monitor)
                img = PILImage.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
                return VideoFrame.from_ndarray(np.asarray(img), format="rgb24")
            except Exception:
                pass

        w, h = 1280, 720
        t    = int(time.monotonic() * 30) % 256
        r    = np.full((h, w), t,             dtype=np.uint8)
        g    = np.full((h, w), (t+85)  % 256, dtype=np.uint8)
        b    = np.full((h, w), (t+170) % 256, dtype=np.uint8)
        return VideoFrame.from_ndarray(np.stack([r, g, b], axis=-1), format="rgb24")

async def gather_complete(pc: RTCPeerConnection, timeout: float = 10.0):
    if pc.iceGatheringState == "complete":
        return
    done = asyncio.Event()

    @pc.on("icegatheringstatechange")
    def _on_state_change():
        if pc.iceGatheringState == "complete":
            done.set()

    try:
        await asyncio.wait_for(done.wait(), timeout=timeout)
    except asyncio.TimeoutError:
        print(f"  [warn] ICE gathering timed out after {timeout}s - sending what we have.")

async def ws_send(ws, **kwargs):
    await ws.send(json.dumps(kwargs))


async def wait_for(ws, *types):
    while True:
        raw = await ws.recv()
        msg = json.loads(raw)
        if msg.get("type") in types:
            return msg
        print(f"  [ignored] {msg}")

async def main():
    screen_w, screen_h = get_monitor_size()
    print("Connecting to server...\n")

    async with websockets.connect(SIGNALING_URL) as ws:

        await ws_send(ws, type="register")
        msg   = await wait_for(ws, "token")
        token = msg["token"]
        print(f"Welcome to Nebula Remote! This is your session token: {token}")
        print("Don't share it with anyone.")
        print("\nWaiting for user...")

        pc = None

        while True:
            raw   = await ws.recv()
            msg   = json.loads(raw)
            mtype = msg.get("type")

            if mtype == "viewer-request":
                print("Viewer request received. Accepting automatically …")
                await ws_send(ws, type="approve", approved=True)
                if pc:
                    await pc.close()
                    pc = None
                print("Setting up WebRTC …")

                pc = RTCPeerConnection(configuration=make_ice_config())
                pc.addTrack(ScreenCaptureTrack(fps=30))

                input_ch: RTCDataChannel = pc.createDataChannel(
                    "input", ordered=False, maxRetransmits=0
                )

                @input_ch.on("message")
                def on_input(data):
                    handle_input_event(data, screen_w, screen_h)

                @input_ch.on("open")
                def on_dc_open():
                    print("  [data channel] Input channel open")

                offer = await pc.createOffer()
                await pc.setLocalDescription(offer)

                print("  Gathering ICE candidates…")
                await gather_complete(pc, timeout=10.0)

                await ws_send(
                    ws,
                    type="offer",
                    sdp=pc.localDescription.sdp,
                    sdpType=pc.localDescription.type,
                )
                print("Offer sent (ICE complete). Waiting for answer …")

            elif mtype == "answer" and pc:
                await pc.setRemoteDescription(
                    RTCSessionDescription(sdp=msg["sdp"], type=msg["sdpType"])
                )
                print("Connection establishing…")

            elif mtype == "ice-candidate" and pc:
                candidate_str = msg.get("candidate", {}).get("candidate", "")
                if candidate_str:
                    from aiortc.sdp import candidate_from_sdp
                    try:
                        c   = msg["candidate"]
                        ice = candidate_from_sdp(candidate_str.split("candidate:")[1])
                        ice.sdpMid        = c.get("sdpMid")
                        ice.sdpMLineIndex = c.get("sdpMLineIndex")
                        await pc.addIceCandidate(ice)
                    except Exception as e:
                        print(f"  ICE candidate warning: {e}")

            elif mtype == "viewer-disconnected":
                print("\nViewer disconnected. Waiting for new viewer…")
                if pc:
                    await pc.close()
                    pc = None

            else:
                print(f"  [signal] {msg}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nHost stopped.")
    except Exception:
        traceback.print_exc()