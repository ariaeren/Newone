"""One-off script: generate GRYND brand logo via Gemini Nano Banana.
Run: cd /app/backend && python scripts/generate_logo.py
"""
import asyncio
import base64
import os
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv(Path(__file__).parent.parent / ".env")

OUT_DIR = Path("/app/frontend/assets/images")
OUT_DIR.mkdir(parents=True, exist_ok=True)


async def gen(session_id: str, prompt: str, filename: str) -> None:
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(api_key=api_key, session_id=session_id, system_message="You are an expert mobile app brand designer.")
    chat.with_model("gemini", "gemini-2.5-flash-image-preview").with_params(modalities=["image", "text"])

    msg = UserMessage(text=prompt)
    text, images = await chat.send_message_multimodal_response(msg)
    print(f"[{filename}] text: {text[:80]!r}")
    if not images:
        print(f"[{filename}] no images returned")
        return
    img_bytes = base64.b64decode(images[0]["data"])
    out_path = OUT_DIR / filename
    out_path.write_bytes(img_bytes)
    print(f"[{filename}] saved -> {out_path} ({len(img_bytes)} bytes)")


async def main():
    # 1. App icon — minimalist symbol, square, dark BG
    await gen(
        "grynd-icon-001",
        prompt=(
            "Design a modern minimalist mobile app icon for an app called GRYND. "
            "The app is a Gen Z gamified habit tracker with a cyber-chill aesthetic. "
            "Style requirements: TRUE BLACK background (#000000) filling the entire 1024x1024 square canvas, "
            "edge-to-edge with no border, no padding, no rounded corners (the OS will round it). "
            "Center the design as a SINGLE bold geometric symbol — a stylized lightning bolt fused with an upward arrow, "
            "or a hexagonal shield with a small flame inside, representing 'leveling up'. "
            "Pick ONE of these concepts and execute it cleanly. "
            "Use an analogous neon gradient FILL on the symbol: electric cyan (#00E5FF) flowing into neon purple (#B026FF), "
            "with a subtle inner glow. Add a very faint film-grain texture overlay for warmth. "
            "Do NOT add any text, letters, or wordmark. Symbol-only. "
            "It must be instantly recognizable at 64x64px (home screen size). High contrast. Premium feel. Production quality."
        ),
        filename="icon.png",
    )

    # 2. Adaptive icon (foreground only — used inside Android safe zone)
    await gen(
        "grynd-adaptive-002",
        prompt=(
            "Generate ONLY the foreground layer for an Android adaptive app icon, 1024x1024 PNG with TRANSPARENT background. "
            "The symbol must be centered within a 720x720 SAFE ZONE in the middle (outer pixels will be cropped to a circle by the OS). "
            "Subject: the SAME stylized lightning-bolt-with-upward-arrow symbol from GRYND brand, "
            "filled with an analogous neon gradient (electric cyan #00E5FF transitioning to neon purple #B026FF). "
            "Add a soft outer glow halo around the symbol. No text. Transparent everywhere except the symbol."
        ),
        filename="adaptive-icon.png",
    )

    # 3. Splash screen image — small centered, dark bg
    await gen(
        "grynd-splash-003",
        prompt=(
            "Design a mobile app splash screen logo, 800x800 PNG with TRANSPARENT background. "
            "Place the GRYND symbol (stylized lightning-bolt-with-upward-arrow) at center, occupying ~50% of the canvas. "
            "Apply the analogous neon gradient fill: cyan #00E5FF to purple #B026FF, with a strong cyan outer glow halo. "
            "Below the symbol, add the wordmark 'GRYND' in a custom modern sans-serif typeface — letterspacing wide (5px), "
            "all caps, color pure white (#FFFFFF), font weight 900. "
            "Total composition: symbol on top, wordmark below, with 24px gap. Centered. Transparent background. Crisp clean lines."
        ),
        filename="splash-image.png",
    )

    # 4. Favicon (small)
    await gen(
        "grynd-favicon-004",
        prompt=(
            "Design a 256x256 favicon for the GRYND app. TRUE BLACK background (#000000) filling entire canvas. "
            "Center: the GRYND lightning-bolt-arrow symbol filled with electric cyan #00E5FF gradient flowing to neon purple #B026FF. "
            "Subtle outer cyan glow. No text. Must be readable at 16x16 browser tab size. High contrast minimalist."
        ),
        filename="favicon.png",
    )


if __name__ == "__main__":
    asyncio.run(main())
