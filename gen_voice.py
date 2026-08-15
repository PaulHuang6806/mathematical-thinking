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
add("哇，数得真清楚！", "praise_first_7_num")
add("哇，一下就找到啦！", "praise_first_7_geo")
add("小手一点就对啦！", "praise_first_8")
add("猫头鹰都看呆啦！", "praise_first_9")
add("一个都没数错！", "praise_first_10_num")
add("一眼就认出它啦！", "praise_first_10_geo")
# 连对庆祝（连续 3 个金星 · 猫头鹰飞到屏幕中间）
add("哇哇哇！连对啦，太厉害啦！", "praise_streak_1")
add("猫头鹰飞过来给你鼓掌！", "praise_streak_2")
add("太棒啦！我们继续！", "praise_streak_3")
add("你好厉害，像小超人一样！", "praise_streak_4")
add("哇！我都想跟你学啦！", "praise_streak_5")
add("连对啦连对啦！继续冲！", "praise_streak_6")
add("哗——！又答对啦！", "praise_streak_7")
# 大庆祝（连续 5 个金星 · 猫头鹰正中星星雨）
add("哇——！太厉害啦！星星都飞起来啦！", "praise_huge_1")
add("你是今天的数学小冠军！", "praise_huge_2")
add("猫头鹰都转圈圈啦！太棒啦！", "praise_huge_3")
add("哇！我已经跟不上你啦！", "praise_huge_4")
# 表扬（重试答对）
add("答对啦！再试一次就成功啦！", "praise_retry_1")
add("坚持就是胜利！", "praise_retry_2")
add("你看，多试就能做到！", "praise_retry_3")
add("进步啦！", "praise_retry_4")
# 鼓励（答错）
add("没关系，再数一次嘛", "encourage_num_1")
add("没关系，再想想嘛", "encourage_logic_1")
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

# ============ 逻辑模块（找规律 / 找不同 / 谁最高） ============
# 题干
add("找规律，下一个是什么？", "prompt_pattern")
add("哪一个不一样？", "prompt_odd")
add("仔细听，想一想", "prompt_infer")
# 提示
add("看看前面是怎么排的", "hint_pattern_1")
add("两个两个一组，跟着排", "hint_pattern_2")
add("三个一组，轮流排", "hint_pattern_3")
add("每个都比前面多几个？", "hint_pattern_num")
add("每次都加一，想一想", "hint_pattern_step1")
add("每次都加二，想一想", "hint_pattern_step2")
add("每次都加三，想一想", "hint_pattern_step3")
add("每次都少两个，想一想", "hint_pattern_stepm2")
add("找找哪一个和别的不一样", "hint_odd_1")
add("看看它们的颜色", "hint_odd_2")
add("它们是一家的吗？", "hint_odd_3")
add("想想谁比谁高", "hint_infer_1")
add("想想谁比谁快", "hint_infer_1b")
add("想想谁比谁大", "hint_infer_1c")
add("想想谁比谁重", "hint_infer_1d")
add("再听一遍条件，慢慢想", "hint_infer_2")
# 找规律揭晓（数字答案 2..14 全预合成；图案揭晓用通用句）
for n in range(2, 15):
    add(f"是 {n}，规律被你发现啦！", f"reveal_pattern_num_{n}")
add("是它，规律被你发现啦！", "reveal_pattern_emoji")
# 找不同揭晓
add("它和别的不一样，我们一起记住它", "reveal_odd")

# 谁最高：推理句全量预合成（与 game-logic.js 的 INFER_GROUPS/INFER_ROTATIONS 完全一致，保证查表命中）
INFER_GROUPS = [
    ("高", "高", "矮", "谁最高？", "谁最矮？", "谁在中间？",
     [("小熊", "🐻"), ("小兔", "🐰"), ("小鸡", "🐔")]),
    ("高", "高", "矮", "谁最高？", "谁最矮？", "谁在中间？",
     [("长颈鹿", "🦒"), ("大象", "🐘"), ("小猴", "🐵")]),
    ("跑得快", "快", "慢", "谁最快？", "谁最慢？", "谁在中间？",
     [("小兔", "🐇"), ("乌龟", "🐢"), ("蜗牛", "🐌")]),
    ("大", "大", "小", "谁最大？", "谁最小？", "谁在中间？",
     [("大象", "🐘"), ("小猪", "🐷"), ("小鸡", "🐔")]),
    ("重", "重", "轻", "谁最重？", "谁最轻？", "谁在中间？",
     [("大象", "🐘"), ("奶牛", "🐮"), ("小猪", "🐷")]),
    ("跑得快", "快", "慢", "谁最快？", "谁最慢？", "谁在中间？",
     [("小猫", "🐱"), ("小狗", "🐶"), ("小鸭", "🦆")]),
]
ROTATIONS = [(0, 1, 2), (1, 2, 0), (2, 0, 1)]
QUESTIONS = ["谁最高？", "谁最矮？", "谁在中间？"]
for gi, (attr, _mw, _mn, qmax, qmin, qmid, animals) in enumerate(INFER_GROUPS):
    for pi, rot in enumerate(ROTATIONS):
        A, B, C = (animals[i] for i in rot)
        for ask, q in enumerate([qmax, qmin, qmid]):
            sent = f"{A[0]}比{B[0]}{attr}，{B[0]}比{C[0]}{attr}，{q}"
            add(sent, f"infer_s_{gi}_{pi}_{ask}")
# 推理揭晓（答案动物名单词预合成）
INFER_ANIMALS = ["小熊", "小兔", "小鸡", "长颈鹿", "大象", "小猴", "乌龟", "蜗牛", "小猪", "奶牛", "小猫", "小狗", "小鸭"]
for name in INFER_ANIMALS:
    add(f"答案是{name}", f"reveal_infer_{name}")
# 逻辑模块专属表扬
add("规律被你发现啦！", "praise_logic_pattern")
add("眼睛真尖！", "praise_logic_odd")
add("推理小能手！", "praise_logic_infer")

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
