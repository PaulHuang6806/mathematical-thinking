# -*- coding: utf-8 -*-
"""
Mathematical Thinking · 语音包生成器
用 edge-tts 合成可爱童声风格语音（晓伊 + 高音调 + 稍快语速），
全部 base64 内联进 js/voice-data.js —— 任何打开方式（file:// / http / 线上）都能播放，
断网可玩；浏览器无 Web Speech 也不怕。
用法: python gen_voice.py   （需要 edge-tts: pip install edge-tts）
"""
import asyncio
import base64
import os
import sys

import edge_tts

VOICE = "zh-CN-XiaoyiNeural"   # 晓伊：明亮活泼的女声，适合儿童内容
RATE = "+8%"                   # 稍快，活泼
PITCH = "+40Hz"                # 音调上调，更可爱

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")
DATA_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "js", "voice-data.js")

# ---------------- 语音清单: (文本, 文件名) ----------------
VOICES = []

def add(text, name):
    VOICES.append((text, name))

# 题干
add("数一数，有几个？", "prompt_count")
add("哪个更大？", "prompt_bigger")
add("哪个更小？", "prompt_smaller")
add("这是什么图形？", "prompt_shape")
for name in ["圆形", "三角形", "正方形", "长方形", "五角星", "心形", "椭圆形", "菱形", "六边形", "月牙形"]:
    add(f"找出{name}", f"find_{name}")

# 表扬（一次答对 · 过程导向）
add("太棒啦，一次就答对！", "praise_first_1")
add("你真认真！", "praise_first_2")
add("我看到了你的努力！", "praise_first_3")
add("数得又快又准！", "praise_first_4_num")
add("认得又快又准！", "praise_first_4_geo")
add("好厉害，继续加油！", "praise_first_5")
add("你越来越棒啦！", "praise_first_6")
# 表扬（重试答对）
add("答对啦！再试一次就成功啦！", "praise_retry_1")
add("坚持就是胜利！", "praise_retry_2")
add("你看，多试就能做到！", "praise_retry_3")
add("进步啦！", "praise_retry_4")
# 鼓励（答错）
add("没关系，再数一次嘛", "encourage_num_1")
add("别急，慢慢来", "encourage_num_2")
add("再仔细看看哦", "encourage_share")
add("你可以的，再试试", "encourage_share_2")
add("没关系，再找一次嘛", "encourage_geo_1")
add("别急，慢慢看", "encourage_geo_2")

# 数感提示 / 数字 / 揭晓
add("再数一次，比比看", "hint_compare")
for n in range(1, 19):
    add(str(n), f"num_{n}")
for n in range(1, 13):
    add(f"是 {n} 个，我们一起记住它", f"reveal_count_{n}")
for n in range(1, 19):
    add(f"答案是 {n}，记住它的样子", f"reveal_cmp_{n}")

# 几何提示（第 2 次答错时: 图形名+特征）/ 揭晓
geo_hints = [
    ("圆形", "圆圆的，没有角"), ("三角形", "有三个尖尖的角"), ("正方形", "四条一样长的边"),
    ("长方形", "四条边，两条长两条短"), ("五角星", "有五个尖尖的角"), ("心形", "像一颗爱心"),
    ("椭圆形", "像鸡蛋一样，长长的圆"), ("菱形", "像风筝一样，四个角"), ("六边形", "有六条边"),
    ("月牙形", "像弯弯的月亮"),
]
for name, hint in geo_hints:
    add(f"{name}，{hint}", f"geo_hint_{name}")
    add(f"这是{name}，我们一起记住它", f"geo_reveal_{name}")

# 其他
add("声音已打开", "sound_on")

# 猫头鹰吉祥物专属
add("开始啦，我们一起玩吧！", "owl_start")
add("哇，太厉害啦！", "owl_perfect")
add("再来一局吧！", "owl_end")

TOTAL = len(VOICES)
print(f"共 {TOTAL} 条语音，音色 {VOICE} rate={RATE} pitch={PITCH}")


async def synth_one(text, out_path, retries=3):
    for i in range(retries):
        try:
            comm = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
            await comm.save(out_path)
            size = os.path.getsize(out_path)
            if size > 300:  # >0.1s，非空
                return True, size
        except Exception as e:  # noqa: BLE001
            last = e
        await asyncio.sleep(1.0 + i)
    return False, getattr(last, "strerror", str(last))  # type: ignore[name-defined]  # noqa: F821


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    results = []
    ok = fail = 0
    for idx, (text, name) in enumerate(VOICES, 1):
        path = os.path.join(OUT_DIR, name + ".mp3")
        if os.path.exists(path) and os.path.getsize(path) > 300:
            results.append((text, name, os.path.getsize(path)))
            ok += 1
            print(f"[{idx}/{TOTAL}] 复用 {name}.mp3")
            continue
        good, info = await synth_one(text, path)
        if good:
            results.append((text, name, info))
            ok += 1
            print(f"[{idx}/{TOTAL}] OK {name}.mp3 ({info}B)")
        else:
            fail += 1
            print(f"[{idx}/{TOTAL}] FAIL {name}: {info}")
        await asyncio.sleep(0.2)  # 温和节流，避免限流

    # 生成 voice-data.js（base64 内联，任何协议可播放）
    lines = ["/* 自动生成，勿手改 —— 运行 python gen_voice.py 重新生成 */",
             "// 语音数据：文本 → base64 mp3 data URI。play() 按文本精确查表，缺失时回退 Web Speech。",
             "(function (g) { 'use strict'; g.__VOICE_DATA__ = {"]
    total_b64 = 0
    for text, name, _ in results:
        with open(os.path.join(OUT_DIR, name + ".mp3"), "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        total_b64 += len(b64)
        esc = text.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'  "{esc}": "data:audio/mpeg;base64,{b64}",')
    lines.append("}; })(typeof window !== 'undefined' ? window : globalThis);")
    with open(DATA_JS, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\n合成成功 {ok} 条，失败 {fail} 条")
    print(f"voice-data.js: {os.path.getsize(DATA_JS)/1024:.0f} KB（含 base64 语音）")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
